import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { steadfastClient } from './service.js';
import { SteadfastWebhookSchema, CreateReturnRequestSchema } from './schema.js';
import { env } from '@/config/env.js';
import { orderService } from '@/modules/orders/service.js';
import { db } from '@/config/db.js';
import { orders } from '@/db/schema/order.js';
import { eq } from 'drizzle-orm';
import { IdParamSchema } from '@/shared/types.js';
import { NotFoundError } from '@/shared/errors.js';

const steadfastRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Webhook (Public) ─────────────────────────────────────────────────────
    fastify.post('/webhooks/steadfast', {
        schema: {
            tags: ['Webhooks'],
            summary: 'Steadfast Courier webhook',
            description: 'Receives delivery status and tracking updates from Steadfast.',
        },
        handler: async (request, reply) => {
            const authHeader = request.headers.authorization;
            const token = env.STEADFAST_WEBHOOK_TOKEN;

            if (token) {
                const expected = `Bearer ${token}`;
                if (authHeader !== expected) {
                    return reply.code(401).send({
                        status: 'error',
                        message: 'Invalid authorization token',
                    });
                }
            }

            const parsed = SteadfastWebhookSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.code(400).send({
                    status: 'error',
                    message: 'Invalid webhook payload',
                });
            }

            const payload = parsed.data;

            // Look up order by consignment_id or invoice
            const order = await db.query.orders.findFirst({
                where: payload.notification_type === 'delivery_status'
                    ? eq(orders.consignmentId, payload.consignment_id)
                    : eq(orders.consignmentId, payload.consignment_id),
            });

            if (!order) {
                return reply.code(404).send({
                    status: 'error',
                    message: 'Order not found',
                });
            }

            if (payload.notification_type === 'delivery_status') {
                const { status, tracking_message } = payload;

                // Update tracking URL with latest status
                await db.update(orders)
                    .set({
                        trackingUrl: tracking_message,
                        updatedAt: new Date(),
                    })
                    .where(eq(orders.id, order.id));

                // Map Steadfast status to order lifecycle
                const terminalStatuses: Record<string, () => Promise<void>> = {
                    delivered: async () => {
                        try { await orderService.deliver(order.id); } catch { /* already in that state */ }
                    },
                    cancelled: async () => {
                        try { await orderService.cancel(order.id, { reason: 'Cancelled by courier' }); } catch { /* already cancelled */ }
                    },
                };

                const handler = terminalStatuses[status];
                if (handler) {
                    await handler();
                }
            }

            return reply.code(200).send({
                status: 'success',
                message: 'Webhook received successfully',
            });
        },
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    fastify.register(
        async (instance) => {
            const app = instance.withTypeProvider<ZodTypeProvider>();
            app.addHook('onRequest', fastify.authenticate);
            app.addHook('onRequest', fastify.adminOnly);

            // ─── Send Order to Steadfast ──────────────────────────────────────
            app.post('/orders/:id/send', {
                schema: {
                    tags: ['Admin | Steadfast'],
                    summary: 'Send order to Steadfast Courier',
                    description: 'Creates a consignment on Steadfast for the given order.',
                    params: IdParamSchema,
                },
                handler: async (request, reply) => {
                    const order = await orderService.adminGetById(request.params.id);
                    if (!order.address) {
                        return reply.code(400).send({ success: false, message: 'Order has no address' });
                    }

                    const invoice = `${order.id}`;
                    const codAmount = order.paymentMethod === 'cod' ? Number(order.total) : 0;

                    const result = await steadfastClient.createOrder({
                        invoice,
                        recipient_name: order.address.recipientName ?? 'N/A',
                        recipient_phone: order.address.phone,
                        alternative_phone: order.address.altPhone ?? undefined,
                        recipient_address: [
                            order.address.address,
                            order.address.area,
                            order.address.city,
                        ].filter(Boolean).join(', '),
                        cod_amount: codAmount,
                        note: `Order ${order.id}`,
                    });

                    if (result.consignment) {
                        await db.update(orders)
                            .set({
                                consignmentId: result.consignment.consignment_id,
                                trackingNumber: result.consignment.tracking_code,
                                trackingUrl: `https://steadfast.com.bd/tracking/${result.consignment.tracking_code}`,
                                updatedAt: new Date(),
                            })
                            .where(eq(orders.id, order.id));
                    }

                    return reply.sendOk(result);
                },
            });

            // ─── Check Balance ────────────────────────────────────────────────
            app.get('/balance', {
                schema: {
                    tags: ['Admin | Steadfast'],
                    summary: 'Check Steadfast balance',
                },
                handler: async (_request, reply) => {
                    const balance = await steadfastClient.getBalance();
                    return reply.sendOk(balance);
                },
            });

            // ─── Get Tracking Status ──────────────────────────────────────────
            app.get('/tracking/:trackingCode', {
                schema: {
                    tags: ['Admin | Steadfast'],
                    summary: 'Get delivery status by tracking code',
                    params: z.object({ trackingCode: z.string() }),
                },
                handler: async (request, reply) => {
                    const status = await steadfastClient.getStatusByTrackingCode(request.params.trackingCode);
                    return reply.sendOk(status);
                },
            });

            // ─── Get Status by Invoice ────────────────────────────────────────
            app.get('/status/invoice/:invoice', {
                schema: {
                    tags: ['Admin | Steadfast'],
                    summary: 'Get delivery status by invoice',
                    params: z.object({ invoice: z.string() }),
                },
                handler: async (request, reply) => {
                    const status = await steadfastClient.getStatusByInvoice(request.params.invoice);
                    return reply.sendOk(status);
                },
            });

            // ─── Get Status by Consignment ID ─────────────────────────────────
            app.get('/status/consignment/:id', {
                schema: {
                    tags: ['Admin | Steadfast'],
                    summary: 'Get delivery status by consignment ID',
                    params: z.object({ id: z.coerce.number() }),
                },
                handler: async (request, reply) => {
                    const status = await steadfastClient.getStatusByConsignmentId(request.params.id);
                    return reply.sendOk(status);
                },
            });

            // ─── Bulk Send Orders ─────────────────────────────────────────────
            app.post('/bulk-send', {
                schema: {
                    tags: ['Admin | Steadfast'],
                    summary: 'Bulk send orders to Steadfast',
                    description: 'Sends multiple orders to Steadfast. Max 500.',
                    body: z.object({
                        orderIds: z.array(z.string().uuid()).min(1).max(500),
                    }),
                },
                handler: async (request, reply) => {
                    const results: Array<{ orderId: string; success: boolean; error?: string }> = [];

                    for (const orderId of request.body.orderIds) {
                        try {
                            const order = await orderService.adminGetById(orderId);
                            if (!order.address) {
                                results.push({ orderId, success: false, error: 'No address' });
                                continue;
                            }

                            const invoice = `${orderId}`;
                            const codAmount = order.paymentMethod === 'cod' ? Number(order.total) : 0;

                            const result = await steadfastClient.createOrder({
                                invoice,
                                recipient_name: order.address.recipientName ?? 'N/A',
                                recipient_phone: order.address.phone,
                                alternative_phone: order.address.altPhone ?? undefined,
                                recipient_address: [
                                    order.address.address,
                                    order.address.area,
                                    order.address.city,
                                ].filter(Boolean).join(', '),
                                cod_amount: codAmount,
                                note: `Order ${orderId}`,
                            });

                            if (result.consignment) {
                                await db.update(orders)
                                    .set({
                                        consignmentId: result.consignment.consignment_id,
                                        trackingNumber: result.consignment.tracking_code,
                                        trackingUrl: `https://steadfast.com.bd/tracking/${result.consignment.tracking_code}`,
                                        updatedAt: new Date(),
                                    })
                                    .where(eq(orders.id, orderId));
                            }

                            results.push({ orderId, success: true });
                        } catch (error: any) {
                            results.push({ orderId, success: false, error: error.message });
                        }
                    }

                    return reply.sendOk(results);
                },
            });

            // ─── Create Return Request ────────────────────────────────────────
            app.post('/return-request', {
                schema: {
                    tags: ['Admin | Steadfast'],
                    summary: 'Create return request on Steadfast',
                    body: CreateReturnRequestSchema,
                },
                handler: async (request, reply) => {
                    const result = await steadfastClient.createReturnRequest(request.body);
                    return reply.sendOk(result);
                },
            });

            // ─── List Return Requests ─────────────────────────────────────────
            app.get('/return-requests', {
                schema: {
                    tags: ['Admin | Steadfast'],
                    summary: 'List return requests from Steadfast',
                },
                handler: async (_request, reply) => {
                    const result = await steadfastClient.getReturnRequests();
                    return reply.sendOk(result);
                },
            });

            // ─── Get Single Return Request ────────────────────────────────────
            app.get('/return-requests/:id', {
                schema: {
                    tags: ['Admin | Steadfast'],
                    summary: 'Get return request by ID',
                    params: z.object({ id: z.coerce.number() }),
                },
                handler: async (request, reply) => {
                    const result = await steadfastClient.getReturnRequest(request.params.id);
                    return reply.sendOk(result);
                },
            });

            // ─── List Payments ────────────────────────────────────────────────
            app.get('/payments', {
                schema: {
                    tags: ['Admin | Steadfast'],
                    summary: 'List payments from Steadfast',
                },
                handler: async (_request, reply) => {
                    const result = await steadfastClient.getPayments();
                    return reply.sendOk(result);
                },
            });

            // ─── Get Single Payment ───────────────────────────────────────────
            app.get('/payments/:id', {
                schema: {
                    tags: ['Admin | Steadfast'],
                    summary: 'Get single payment with consignments',
                    params: z.object({ id: z.coerce.number() }),
                },
                handler: async (request, reply) => {
                    const result = await steadfastClient.getSinglePayment(request.params.id);
                    return reply.sendOk(result);
                },
            });

            // ─── Get Police Stations ──────────────────────────────────────────
            app.get('/police-stations', {
                schema: {
                    tags: ['Admin | Steadfast'],
                    summary: 'List police stations from Steadfast',
                },
                handler: async (_request, reply) => {
                    const result = await steadfastClient.getPoliceStations();
                    return reply.sendOk(result);
                },
            });
        },
        { prefix: '/admin/steadfast' },
    );
};

export default steadfastRoutes;

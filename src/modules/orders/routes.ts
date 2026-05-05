import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { orderService } from './service.js';
import { CreateOrderSchema, OrderParamsSchema, UpdateStatusSchema, ShipOrderSchema, UpdatePaymentStatusSchema, CancelOrderSchema, CancelRequestSchema } from './schema.js';
import { success, paginated } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';

const ordersPlugin: FastifyPluginAsync = async (fastify) => {
    // ─── Customer Routes ─────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.post('/', {
            schema: { body: CreateOrderSchema },
            handler: async (request, reply) => {
                const order = await orderService.create(request.user.id, request.body);
                return reply.code(201).send(success({ orderId: order.id }, 'Order placed successfully'));
            },
        });

        app.get('/', {
            handler: async (request) => {
                const userOrders = await orderService.list(request.user.id);
                return success(userOrders);
            },
        });

        app.get('/:id', {
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const order = await orderService.getById(request.user.id, request.params.id);
                return success(order);
            },
        });

        // ─── Order Tracking ────────────────────────────────────────────────────────
        app.get('/:id/track', {
            schema: { params: IdParamSchema },
            handler: async (request, reply) => {
                const tracking = await orderService.getTracking(request.params.id);
                return success(tracking);
            },
        });

        app.patch('/:id/cancel', {
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const result = await orderService.cancel(request.params.id);
                return success(result);
            },
        });


    }, { prefix: '/orders' });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.get('/', {
            preHandler: [fastify.requirePermission('read', 'orders')],
            schema: { querystring: OrderParamsSchema },
            handler: async (request) => {
                const { rows, total } = await orderService.adminList(request.query);
                return paginated(rows, {
                    page: request.query.page,
                    limit: request.query.limit,
                    total
                });
            },
        });

        app.get("/user/:id", {
            preHandler: [fastify.requirePermission('read', 'orders')],
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const userOrders = await orderService.list(request.params.id);
                return success(userOrders);
            },
        });

        app.get('/:id', {
            preHandler: [fastify.requirePermission('read', 'orders')],
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const order = await orderService.adminGetById(request.params.id);
                return success(order);
            },
        });

        app.patch('/:id/status', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: { params: IdParamSchema, body: UpdateStatusSchema },
            handler: async (request) => {
                const result = await orderService.updateStatus(request.params.id, request.body);
                return success(result);
            },
        });

        app.patch('/:id/payment-status', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: { params: IdParamSchema, body: UpdatePaymentStatusSchema },
            handler: async (request) => {
                const result = await orderService.updatePaymentStatus(request.params.id, request.body);
                return success(result);
            },
        });

        // ─── Order Lifecycle Actions ──────────────────────────────────────────────────
        app.patch('/:id/confirm', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const result = await orderService.confirm(request.params.id);
                return success(result, 'Order confirmed');
            },
        });

        app.patch('/:id/process', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const result = await orderService.process(request.params.id);
                return success(result, 'Order processing started');
            },
        });

        app.patch('/:id/ship', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: { params: IdParamSchema, body: ShipOrderSchema },
            handler: async (request) => {
                const result = await orderService.ship(request.params.id, request.body);
                return success(result, 'Order shipped');
            },
        });

        app.patch('/:id/deliver', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const result = await orderService.deliver(request.params.id);
                return success(result, 'Order delivered');
            },
        });

        app.patch('/:id/mark-paid', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const result = await orderService.markAsPaid(request.params.id);
                return success(result, 'Order marked as paid');
            },
        });

        app.patch('/:id/return', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const result = await orderService.return(request.params.id);
                return success(result, 'Order marked as returned');
            },
        });

        app.patch('/:id/cancel', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: { params: IdParamSchema, body: CancelOrderSchema },
            handler: async (request) => {
                const result = await orderService.cancel(request.params.id, request.body);
                return success(result, 'Order cancelled');
            },
        });

        // cancel request action
        app.patch('/:id/cancel-request/approve', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: { params: IdParamSchema, body: CancelOrderSchema },
            handler: async (request) => {
                const result = await orderService.approveCancelRequest(request.params.id, request.body);
                return success(result, 'Order cancel request approved');
            },
        });

        app.patch('/:id/cancel-request/reject', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: { params: IdParamSchema, body: CancelOrderSchema },
            handler: async (request) => {
                const result = await orderService.rejectCancelRequest(request.params.id, request.body);
                return success(result, 'Order cancel request rejected');
            },
        });

        // ─── Order Manipulation Actions ──────────────────────────────────────────────
        app.delete('/:id', {
            preHandler: [fastify.requirePermission('delete', 'orders')],
            schema: { params: IdParamSchema },
            handler: async (request) => {
                await orderService.delete(request.params.id);
                return success(null, 'Order deleted successfully');
            },
        });

    }, { prefix: '/admin/orders' });
};

export default fp(ordersPlugin, { name: 'order-routes' });

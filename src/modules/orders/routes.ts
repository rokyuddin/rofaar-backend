import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { orderService } from './service.js';
import {
    CreateOrderSchema,
    OrderParamsSchema,
    UpdateStatusSchema,
    UpdatePaymentStatusSchema,
    ShipOrderSchema,
    CancelOrderSchema,
} from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const orderRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Customer Routes ─────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.post('/', {
            schema: {
                tags: ['Orders'],
                summary: 'Place order',
                description: 'Places a new order using the items currently in the customer\'s cart.',
                body: CreateOrderSchema
            },
            handler: async (request, reply) => {
                const order = await orderService.create(request.user.id, request.body);
                return reply.sendCreated({ orderId: order.id }, 'Order placed successfully');
            },
        });

        app.get('/', {
            schema: {
                tags: ['Orders'],
                summary: 'List my orders',
                description: 'Returns a list of orders placed by the authenticated customer.',
            },
            handler: async (request, reply) => {
                const userOrders = await orderService.list(request.user.id);
                return reply.sendOk(userOrders);
            },
        });

        app.get('/:id', {
            schema: {
                tags: ['Orders'],
                summary: 'Get order detail',
                description: 'Returns detailed information for a specific order.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                const order = await orderService.getById(request.user.id, request.params.id);
                return reply.sendOk(order);
            },
        });

        // ─── Order Tracking ────────────────────────────────────────────────────────
        app.get('/:id/track', {
            schema: {
                tags: ['Orders'],
                summary: 'Track order',
                description: 'Returns the status history and tracking information for an order.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                const tracking = await orderService.getTracking(request.user.id, request.params.id);
                return reply.sendOk(tracking);
            },
        });

        app.patch('/:id/cancel', {
            schema: {
                tags: ['Orders'],
                summary: 'Cancel order',
                description: 'Allows a customer to cancel their order if it is still in a pending or confirmed state.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                const result = await orderService.customerCancel(request.user.id, request.params.id);
                return reply.sendOk(result);
            },
        });


    }, { prefix: '/orders' });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.get('/', {
            preHandler: [fastify.requirePermission('read', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'List orders (Admin)',
                description: 'Returns a paginated list of all orders with optional status and user filters.',
                querystring: OrderParamsSchema
            },
            handler: async (request, reply) => {
                const { rows, total } = await orderService.adminList(request.query);
                return reply.sendPaginated(rows, {
                    page: request.query.page,
                    limit: request.query.limit,
                    total
                });
            },
        });

        app.get("/user/:id", {
            preHandler: [fastify.requirePermission('read', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'List orders by user',
                description: 'Returns all orders placed by a specific user.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                const userOrders = await orderService.list(request.params.id);
                return reply.sendOk(userOrders);
            },
        });

        app.get('/:id', {
            preHandler: [fastify.requirePermission('read', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Get order detail (Admin)',
                description: 'Returns full details for any order.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                const order = await orderService.adminGetById(request.params.id);
                return reply.sendOk(order);
            },
        });

        app.patch('/:id/status', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Update order status',
                description: 'Updates the status of an order (e.g., pending -> confirmed).',
                params: IdParamSchema,
                body: UpdateStatusSchema
            },
            handler: async (request, reply) => {
                const result = await orderService.updateStatus(request.params.id, request.body);
                return reply.sendOk(result);
            },
        });

        app.patch('/:id/payment-status', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Update payment status',
                description: 'Updates the payment status of an order (e.g., unpaid -> paid).',
                params: IdParamSchema,
                body: UpdatePaymentStatusSchema
            },
            handler: async (request, reply) => {
                const result = await orderService.updatePaymentStatus(request.params.id, request.body);
                return reply.sendOk(result);
            },
        });

        // ─── Order Lifecycle Actions ──────────────────────────────────────────────────
        app.patch('/:id/confirm', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Confirm order',
                description: 'Shortcut to set order status to confirmed.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                const result = await orderService.confirm(request.params.id);
                return reply.sendOk(result, 'Order confirmed');
            },
        });

        app.patch('/:id/process', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Process order',
                description: 'Shortcut to set order status to processing.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                const result = await orderService.process(request.params.id);
                return reply.sendOk(result, 'Order processing started');
            },
        });

        app.patch('/:id/ship', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Ship order',
                description: 'Shortcut to set order status to shipped and add tracking info.',
                params: IdParamSchema,
                body: ShipOrderSchema
            },
            handler: async (request, reply) => {
                const result = await orderService.ship(request.params.id, request.body);
                return reply.sendOk(result, 'Order shipped');
            },
        });

        app.patch('/:id/deliver', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Deliver order',
                description: 'Shortcut to set order status to delivered.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                const result = await orderService.deliver(request.params.id);
                return reply.sendOk(result, 'Order delivered');
            },
        });

        app.patch('/:id/mark-paid', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Mark order as paid',
                description: 'Shortcut to set payment status to paid.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                const result = await orderService.markAsPaid(request.params.id);
                return reply.sendOk(result, 'Order marked as paid');
            },
        });

        app.patch('/:id/return', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Mark order as returned',
                description: 'Shortcut to set order status to returned.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                const result = await orderService.return(request.params.id);
                return reply.sendOk(result, 'Order marked as returned');
            },
        });

        app.patch('/:id/cancel', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Cancel order (Admin)',
                description: 'Cancels an order and restocks items.',
                params: IdParamSchema,
                body: CancelOrderSchema
            },
            handler: async (request, reply) => {
                const result = await orderService.cancel(request.params.id, request.body);
                return reply.sendOk(result, 'Order cancelled');
            },
        });

        // cancel request action
        app.patch('/:id/cancel-request/approve', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Approve cancel request',
                description: 'Approves a customer\'s request to cancel an order.',
                params: IdParamSchema,
                body: CancelOrderSchema
            },
            handler: async (request, reply) => {
                const result = await orderService.approveCancelRequest(request.params.id, request.body);
                return reply.sendOk(result, 'Order cancel request approved');
            },
        });

        app.patch('/:id/cancel-request/reject', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Reject cancel request',
                description: 'Rejects a customer\'s request to cancel an order.',
                params: IdParamSchema,
                body: CancelOrderSchema
            },
            handler: async (request, reply) => {
                const result = await orderService.rejectCancelRequest(request.params.id, request.body, request.user.id);
                return reply.sendOk(result, 'Order cancel request rejected');
            },
        });

        // ─── Order Manipulation Actions ──────────────────────────────────────────────
        app.delete('/:id', {
            preHandler: [fastify.requirePermission('delete', 'orders')],
            schema: {
                tags: ['Admin | Orders'],
                summary: 'Delete order',
                description: 'Permanently deletes an order record.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                await orderService.delete(request.params.id);
                return reply.sendOk(null, 'Order deleted successfully');
            },
        });

    }, { prefix: '/admin/orders' });
};

export default orderRoutes;

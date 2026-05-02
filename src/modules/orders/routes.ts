import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { orderService } from './service.js';
import { CreateOrderSchema, OrderParamsSchema, UpdateOrderStatusSchema } from './schema.js';
import { success, paginated } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';
import { createSwaggerConfig } from '@/shared/swagger.js';
import type { CreateOrderBody, UpdateOrderStatusBody, OrderPaginationQuery } from './schema.js';

const ordersPlugin: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Protected Routes (User) ──────────────────────────────────────────────

    f.post('/orders', {
        preHandler: [fastify.authenticate],
        schema: { body: CreateOrderSchema },
        handler: async (request, reply) => {
            const order = await orderService.create(request.user.id, request.body);
            return reply.code(201).send(success({ orderId: order.id }, 'Order placed successfully'));
        },
    });

    f.get('/orders', {
        preHandler: [fastify.authenticate],
        handler: async (request) => {
            const userOrders = await orderService.list(request.user.id);
            return success(userOrders);
        },
    });

    f.get('/orders/:id', {
        preHandler: [fastify.authenticate],
        schema: { params: IdParamSchema },
        handler: async (request) => {
            const order = await orderService.getById(request.user.id, request.params.id);
            return success(order);
        },
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────

    f.get('/admin/orders', {
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

    f.get('/admin/orders/:id', {
        preHandler: [fastify.requirePermission('read', 'orders')],
        schema: { params: IdParamSchema },
        handler: async (request) => {
            const order = await orderService.adminGetById(request.params.id);
            return success(order);
        },
    });

    f.patch('/admin/orders/:id/status', {
        preHandler: [fastify.requirePermission('update', 'orders')],
        schema: { params: IdParamSchema, body: UpdateOrderStatusSchema },
        handler: async (request) => {
            const result = await orderService.updateStatus(request.params.id, request.body);
            return success(result);
        },
    });
};

export default fp(ordersPlugin, { name: 'order-routes' });

import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { orderService } from './service.js';
import { CreateOrderSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';

const ordersPlugin: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.addHook('onRequest', fastify.authenticate);

    // POST /orders
    f.post('/orders', {
        schema: { body: CreateOrderSchema },
        handler: async (request, reply) => {
            const order = await orderService.create(request.user.id, request.body);
            return reply.code(201).send(success({ orderId: order.id }, 'Order placed successfully'));
        },
    });

    // GET /orders
    f.get('/orders', {
        handler: async (request) => {
            const userOrders = await orderService.list(request.user.id);
            return success(userOrders);
        },
    });

    // GET /orders/:id
    f.get('/orders/:id', {
        schema: { params: IdParamSchema },
        handler: async (request) => {
            const order = await orderService.getById(request.user.id, request.params.id);
            return success(order);
        },
    });
};

export default fp(ordersPlugin, { name: 'order-routes' });

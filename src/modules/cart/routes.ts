import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { cartService } from './service.js';
import { AddCartItemSchema, UpdateCartItemSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';

const cartRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.addHook('onRequest', fastify.authenticate);

    // GET /cart
    f.get('/cart', {
        handler: async (request) => {
            const items = await cartService.get(request.user.id);
            return success(items);
        },
    });

    // POST /cart
    f.post('/cart', {
        schema: { body: AddCartItemSchema },
        handler: async (request, reply) => {
            const item = await cartService.addItem(request.user.id, request.body);
            return reply.code(201).send(success(item));
        },
    });

    // PUT /cart/:id
    f.put('/cart/:id', {
        schema: { params: IdParamSchema, body: UpdateCartItemSchema },
        handler: async (request) => {
            const item = await cartService.updateItem(request.user.id, request.params.id, request.body.quantity);
            return success(item);
        },
    });

    // DELETE /cart/:id
    f.delete('/cart/:id', {
        schema: { params: IdParamSchema },
        handler: async (request, reply) => {
            await cartService.removeItem(request.user.id, request.params.id);
            return reply.code(204).send();
        },
    });
};

export default fp(cartRoutes, { name: 'cart-routes' });

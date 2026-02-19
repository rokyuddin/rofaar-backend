import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { wishlistService } from './service.js';
import { AddWishlistItemSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';

const wishlistPlugin: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.addHook('onRequest', fastify.authenticate);

    // GET /wishlist
    f.get('/wishlist', {
        handler: async (request) => {
            const items = await wishlistService.get(request.user.id);
            return success(items);
        },
    });

    // POST /wishlist
    f.post('/wishlist', {
        schema: { body: AddWishlistItemSchema },
        handler: async (request, reply) => {
            const item = await wishlistService.addItem(request.user.id, request.body.productId);
            return reply.code(201).send(success(item));
        },
    });

    // DELETE /wishlist/:id
    f.delete('/wishlist/:id', {
        schema: { params: IdParamSchema },
        handler: async (request, reply) => {
            await wishlistService.removeItem(request.user.id, request.params.id);
            return reply.code(204).send();
        },
    });
};

export default fp(wishlistPlugin, { name: 'wishlist-routes' });

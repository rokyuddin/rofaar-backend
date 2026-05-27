import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { wishlistService } from './service.js';
import { AddWishlistItemSchema } from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const wishlistRoutes: FastifyPluginAsync = async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>();
    app.addHook('onRequest', fastify.authenticate);

    app.get('/list', {
        schema: {
            tags: ['Wishlist'],
            summary: 'Get wishlist items',
        },
        handler: async (request, reply) => {
            const items = await wishlistService.get(request.user.id);
            return reply.sendOk(items);
        },
    });

    app.post('/add', {
        schema: {
            tags: ['Wishlist'],
            summary: 'Add item to wishlist',
            body: AddWishlistItemSchema
        },
        handler: async (request, reply) => {
            const item = await wishlistService.addItem(request.user.id, request.body.productId);
            return reply.sendCreated(item);
        },
    });

    app.delete('/remove/:id', {
        schema: {
            tags: ['Wishlist'],
            summary: 'Remove wishlist item',
            params: IdParamSchema
        },
        handler: async (request, reply) => {
            await wishlistService.removeItem(request.user.id, request.params.id);
            return reply.sendOk(null, 'Item removed from wishlist');
        },
    });

    app.post('/move/:id', {
        schema: {
            tags: ['Wishlist'],
            summary: 'Move item to cart',
            params: IdParamSchema
        },
        handler: async (request, reply) => {
            await wishlistService.moveToCart(request.user.id, request.params.id);
            return reply.sendOk(null, 'Item moved to cart');
        },
    });

    app.post('/move/all', {
        schema: {
            tags: ['Wishlist'],
            summary: 'Move all items to cart',
        },
        handler: async (request, reply) => {
            await wishlistService.moveAllToCart(request.user.id);
            return reply.sendOk(null, 'All items moved to cart');
        },
    });
};

export default wishlistRoutes;

import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { wishlistService } from './service.js';
import { AddWishlistItemSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';
import { createSwaggerConfig } from '@/shared/swagger.js';

const wishlistPlugin: FastifyPluginAsync = async (fastify) => {
    // ─── Authenticated Wishlist Routes ───────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        // GET /wishlist/list
        app.get('/list', {
            schema: {
                ...createSwaggerConfig(['User | Wishlist'], 'Get Wishlist', 'Get current user\'s wishlist items', true),
            },
            handler: async (request) => {
                const items = await wishlistService.get(request.user.id);
                return success(items);
            },
        });

        // POST /wishlist/add
        app.post('/add', {
            schema: {
                ...createSwaggerConfig(['User | Wishlist'], 'Add to Wishlist', 'Add product to wishlist', true),
                body: AddWishlistItemSchema,
            },
            handler: async (request, reply) => {
                const item = await wishlistService.addItem(request.user.id, request.body.productId);
                return reply.code(201).send(success(item));
            },
        });


        // DELETE /wishlist/remove/:id
        app.delete('/remove/:id', {
            schema: {
                ...createSwaggerConfig(['User | Wishlist'], 'Remove from Wishlist', 'Remove item from wishlist', true),
                params: IdParamSchema,
            },
            handler: async (request, reply) => {
                await wishlistService.removeItem(request.user.id, request.params.id);
                return reply.code(204).send();
            },
        });

        // POST /wishlist/move/:id
        app.post('/move/:id', {
            schema: {
                ...createSwaggerConfig(['User | Wishlist'], 'Move to Cart', 'Move item from wishlist to cart', true),
                params: IdParamSchema,
            },
            handler: async (request, reply) => {
                await wishlistService.moveToCart(request.user.id, request.params.id);
                return reply.code(200).send(success(null, 'Item moved to cart'));
            },
        });

        // POST /wishlist/move/all
        app.post('/move/all', {
            schema: {
                ...createSwaggerConfig(['User | Wishlist'], 'Move All to Cart', 'Move all items from wishlist to cart', true),
            },
            handler: async (request, reply) => {
                await wishlistService.moveAllToCart(request.user.id);
                return reply.code(200).send(success(null, 'All items moved to cart'));
            },
        });

    }, { prefix: '/wishlist' });
};

export default wishlistPlugin;

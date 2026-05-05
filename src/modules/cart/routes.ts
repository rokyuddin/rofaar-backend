import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { cartService } from './service.js';
import { AddCartItemSchema, UpdateCartItemSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema, UuidSchema } from '@/shared/types.js';
import { createSwaggerConfig } from '@/shared/swagger.js';
import { z } from 'zod';

const cartRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Authenticated Cart Routes ───────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        // GET /cart/list
        app.get('/list', {
            schema: {
                ...createSwaggerConfig(['User | Cart'], 'Get Cart', 'Get current user\'s shopping cart', true),
            },
            handler: async (request) => {
                const items = await cartService.get(request.user.id);
                return success(items);
            },
        });

        // POST /cart/add
        app.post('/add', {
            schema: {
                ...createSwaggerConfig(['User | Cart'], 'Add to Cart', 'Add item to shopping cart', true),
                body: AddCartItemSchema,
            },
            handler: async (request, reply) => {
                const item = await cartService.addItem(request.user.id, request.body);
                return reply.code(201).send(success(item));
            },
        });

        // PUT /cart/update/:id
        app.put('/update/:id', {
            schema: {
                ...createSwaggerConfig(['User | Cart'], 'Update Cart Item', 'Update quantity of an item in cart', true),
                params: IdParamSchema,
                body: UpdateCartItemSchema,
            },
            handler: async (request) => {
                const item = await cartService.updateItem(request.user.id, request.params.id, request.body.quantity);
                return success(item);
            },
        });

        // DELETE /cart/remove/:id
        app.delete('/remove/:id', {
            schema: {
                ...createSwaggerConfig(['User | Cart'], 'Remove from Cart', 'Remove item from shopping cart', true),
                params: IdParamSchema,
            },
            handler: async (request, reply) => {
                await cartService.removeItem(request.user.id, request.params.id);
                return reply.code(204).send();
            },
        });

        // DELETE /cart/clear
        app.delete('/clear', {
            schema: {
                ...createSwaggerConfig(['User | Cart'], 'Clear Cart', 'Clear all items from shopping cart', true),
            },
            handler: async (request, reply) => {
                await cartService.clear(request.user.id);
                return reply.code(204).send();
            },
        });
    }, { prefix: '/cart' });

    // ─── Admin Cart Routes ───────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.adminOnly);

        // GET /admin/cart/user/:id
        app.get('/user/:id', {
            schema: {
                ...createSwaggerConfig(['Admin | Cart'], 'Get User Cart', 'Get a specific user\'s shopping cart', true),
                params: IdParamSchema,
            },
            handler: async (request) => {
                const items = await cartService.get(request.params.id);
                return success(items);
            },
        });

        // DELETE /admin/cart/user/:id
        app.delete('/user/:id', {
            schema: {
                ...createSwaggerConfig(['Admin | Cart'], 'Clear User Cart', 'Clear a specific user\'s shopping cart', true),
                params: IdParamSchema,
            },
            handler: async (request, reply) => {
                await cartService.clear(request.params.id);
                return reply.code(204).send();
            },
        });

        // PUT /admin/cart/user/:userId/update/:id
        app.put('/user/:userId/update/:id', {
            schema: {
                ...createSwaggerConfig(['Admin | Cart'], 'Update User Cart Item', 'Update quantity of an item in a specific user\'s cart', true),
                params: z.object({
                    userId: UuidSchema,
                    id: UuidSchema, // productId
                }),
                body: UpdateCartItemSchema,
            },
            handler: async (request) => {
                const item = await cartService.updateItem(request.params.userId, request.params.id, request.body.quantity);
                return success(item);
            },
        });
    }, { prefix: '/admin/cart' });
};

export default cartRoutes;

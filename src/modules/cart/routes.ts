import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { cartService } from './service.js';
import { AddCartItemSchema, UpdateCartItemSchema } from './schema.js';
import { IdParamSchema, UuidSchema } from '@/shared/types.js';
import { z } from 'zod';

const cartRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Customer Routes ───────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.get('/list', {
            schema: {
                tags: ['Cart'],
                summary: 'Get cart items',
                description: 'Returns all items currently in the authenticated user\'s shopping cart.',
            },
            handler: async (request, reply) => {
                const items = await cartService.get(request.user.id);
                return reply.sendOk(items);
            },
        });

        app.post('/add', {
            schema: {
                tags: ['Cart'],
                summary: 'Add item to cart',
                description: 'Adds a product to the authenticated user\'s shopping cart.',
                body: AddCartItemSchema
            },
            handler: async (request, reply) => {
                const item = await cartService.addItem(request.user.id, request.body);
                return reply.sendCreated(item);
            },
        });

        app.put('/update/:id', {
            schema: {
                tags: ['Cart'],
                summary: 'Update cart item',
                description: 'Updates the quantity of an item in the shopping cart.',
                params: IdParamSchema,
                body: UpdateCartItemSchema
            },
            handler: async (request, reply) => {
                const item = await cartService.updateItem(request.user.id, request.params.id, request.body.quantity);
                return reply.sendOk(item);
            },
        });

        app.delete('/remove/:id', {
            schema: {
                tags: ['Cart'],
                summary: 'Remove cart item',
                description: 'Removes an item from the shopping cart.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                await cartService.removeItem(request.user.id, request.params.id);
                return reply.sendOk(null, 'Item removed from cart');
            },
        });

        app.delete('/clear', {
            schema: {
                tags: ['Cart'],
                summary: 'Clear cart',
                description: 'Removes all items from the shopping cart.',
            },
            handler: async (request, reply) => {
                await cartService.clear(request.user.id);
                return reply.sendOk(null, 'Cart cleared');
            },
        });
    }, { prefix: '/cart' });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.get('/user/:id', {
            preHandler: [fastify.requirePermission('read', 'orders')],
            schema: {
                tags: ['Admin | Cart'],
                summary: 'Get user cart (Admin)',
                description: 'Returns the cart items for a specific user.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                const items = await cartService.get(request.params.id);
                return reply.sendOk(items);
            },
        });

        app.delete('/user/:id', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Cart'],
                summary: 'Clear user cart (Admin)',
                description: 'Removes all items from a specific user\'s cart.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                await cartService.clear(request.params.id);
                return reply.sendOk(null, 'User cart cleared');
            },
        });

        app.put('/user/:userId/update/:id', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Cart'],
                summary: 'Update user cart item (Admin)',
                description: 'Updates the quantity of an item in a specific user\'s cart.',
                params: z.object({ userId: UuidSchema, id: UuidSchema }),
                body: UpdateCartItemSchema,
            },
            handler: async (request, reply) => {
                const item = await cartService.updateItem(
                    request.params.userId,
                    request.params.id,
                    request.body.quantity,
                );
                return reply.sendOk(item);
            },
        });
    }, { prefix: '/admin/cart' });
};

export default cartRoutes;

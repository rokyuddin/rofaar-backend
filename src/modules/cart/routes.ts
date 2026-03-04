import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { cartService } from './service.js';
import { AddCartItemSchema, UpdateCartItemSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';
import { createSwaggerConfig } from '@/shared/swagger.js';

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
                ...createSwaggerConfig(['User | Cart'], 'Update Cart Item', 'Update quantity of cart item', true),
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
                await cartService.clearCart(request.user.id);
                return reply.code(204).send();
            },
        });
    }, { prefix: '/cart' });
};

export default cartRoutes;

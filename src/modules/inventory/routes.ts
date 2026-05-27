import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { inventoryService } from './service.js';
import { AdjustStockSchema } from './schema.js';
import { z } from 'zod';

const inventoryRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);
        app.addHook('onRequest', fastify.adminOnly);

        app.post('/adjust', {
            schema: {
                tags: ['Admin | Inventory'],
                summary: 'Adjust stock level',
                description: 'Manually increases or decreases the stock level of a product.',
                body: AdjustStockSchema
            },
            handler: async (request, reply) => {
                const { productId, quantityChange, type, note } = request.body;
                const log = await inventoryService.adjustStock({
                    productId,
                    quantityChange,
                    type,
                    performedBy: request.user.id,
                    ...(note !== undefined ? { note } : {}),
                });
                return reply.sendOk(log);
            },
        });

        app.get('/logs', {
            schema: {
                tags: ['Admin | Inventory'],
                summary: 'Get inventory logs',
                description: 'Returns a history of stock adjustments, optionally filtered by product.',
                querystring: z.object({ productId: z.string().uuid().optional() }),
            },
            handler: async (request, reply) => {
                const logs = await inventoryService.getLogs(request.query.productId);
                return reply.sendOk(logs);
            },
        });

        app.get('/low-stock', {
            schema: {
                tags: ['Admin | Inventory'],
                summary: 'Get low stock products',
                description: 'Returns a list of products that are below the low-stock threshold.',
            },
            handler: async (_request, reply) => {
                const products = await inventoryService.getLowStockProducts();
                return reply.sendOk(products);
            },
        });
    }, { prefix: '/admin/inventory' });
};

export default inventoryRoutes;

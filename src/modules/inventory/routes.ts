import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { inventoryService } from './service.js';
import { AdjustStockSchema, InventoryLogResponseSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { z } from 'zod';

const inventoryRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.register(async (app) => {
        app.addHook('onRequest', fastify.authenticate);
        app.addHook('onRequest', fastify.admin);

        app.post('/adjust', {
            schema: {
                body: AdjustStockSchema,
                response: { 200: z.object({ success: z.literal(true), data: InventoryLogResponseSchema }) },
            },
            handler: async (request) => {
                const log = await inventoryService.adjustStock({
                    ...request.body,
                    performedBy: request.user.id,
                });
                return success(log);
            },
        });

        app.get('/logs', {
            schema: {
                querystring: z.object({ productId: z.string().uuid().optional() }),
                response: { 200: z.object({ success: z.literal(true), data: z.array(z.any()) }) },
            },
            handler: async (request) => {
                const logs = await inventoryService.getLogs(request.query.productId);
                return success(logs);
            },
        });

        app.get('/low-stock', {
            schema: {
                response: { 200: z.object({ success: z.literal(true), data: z.array(z.any()) }) },
            },
            handler: async () => {
                const products = await inventoryService.getLowStockProducts();
                return success(products);
            },
        });
    }, { prefix: '/admin/inventory' });
};

export default inventoryRoutes;

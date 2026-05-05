import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { success } from '@/shared/response.js';
import { createSwaggerConfig } from '@/shared/swagger.js';

import { adminService } from './service.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();
    f.addHook('onRequest', fastify.authenticate);
    f.addHook('onRequest', fastify.admin);

    f.get('/stats', {
        handler: async () => {
            const stats = await adminService.getStats();
            return success(stats);
        },
    });

    f.get('/recent-orders', {
        handler: async () => {
            const orders = await adminService.getRecentOrders();
            return success(orders);
        },
    });
};

export default adminRoutes;

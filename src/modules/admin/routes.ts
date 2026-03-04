import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { success } from '@/shared/response.js';
import { createSwaggerConfig } from '@/shared/swagger.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();
    f.addHook('onRequest', fastify.adminOnly);

    f.get('/admin/stats', {
        schema: {
            ...createSwaggerConfig(['Admin'], 'Admin Dashboard Stats', 'Get admin dashboard statistics (stub)', true),
        },
        handler: async () => success({ users: 0, orders: 0 }, 'Admin module stub'),
    });
};

export default adminRoutes;

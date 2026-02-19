import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { success } from '@/shared/response.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();
    f.addHook('onRequest', fastify.adminOnly);

    f.get('/admin/stats', {
        handler: async () => success({ users: 0, orders: 0 }, 'Admin module stub'),
    });
};

export default fp(adminRoutes, { name: 'admin-routes' });

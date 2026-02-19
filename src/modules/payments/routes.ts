import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { success } from '@/shared/response.js';

const paymentsRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();
    f.addHook('onRequest', fastify.authenticate);

    f.post('/payments/callback', {
        handler: async () => success({ status: 'received' }, 'Payments callback stub'),
    });
};

export default fp(paymentsRoutes, { name: 'payments-routes' });

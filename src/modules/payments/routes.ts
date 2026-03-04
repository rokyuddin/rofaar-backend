import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { success } from '@/shared/response.js';
import { createSwaggerConfig } from '@/shared/swagger.js';

const paymentsRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();
    f.addHook('onRequest', fastify.authenticate);

    f.post('/payments/callback', {
        schema: {
            ...createSwaggerConfig(['Payments'], 'Payment Callback', 'Handle payment gateway callbacks', true),
        },
        handler: async () => success({ status: 'received' }, 'Payments callback stub'),
    });
};

export default paymentsRoutes;

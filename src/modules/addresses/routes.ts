import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { success } from '@/shared/response.js';

const addressesPlugin: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();
    f.addHook('onRequest', fastify.authenticate);

    f.get('/addresses', {
        handler: async () => success([], 'Addresses module stub'),
    });
};

export default fp(addressesPlugin, { name: 'addresses-routes' });

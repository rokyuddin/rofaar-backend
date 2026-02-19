import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { success } from '@/shared/response.js';

const combosRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.get('/combos', {
        handler: async () => success([], 'Combos module stub'),
    });
};

export default fp(combosRoutes, { name: 'combos-routes' });

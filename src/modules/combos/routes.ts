import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { success } from '@/shared/response.js';
import { createSwaggerConfig } from '@/shared/swagger.js';

const combosRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.get('/combos', {
        schema: {
            ...createSwaggerConfig(['Combos'], 'List Combos', 'Get available product bundles and combos', false),
        },
        handler: async () => success([], 'Combos module stub'),
    });
};

export default combosRoutes;

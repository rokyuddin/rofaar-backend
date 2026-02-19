import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { catalogService } from './service.js';
import { success } from '@/shared/response.js';

const catalogRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.get('/categories', {
        handler: async () => {
            const result = await catalogService.listCategories();
            return success(result);
        },
    });

    f.get('/tags', {
        handler: async () => {
            const result = await catalogService.listTags();
            return success(result);
        },
    });
};

export default fp(catalogRoutes, { name: 'catalog-routes' });

import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { success } from '@/shared/response.js';

const reviewsRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.get('/reviews', {
        handler: async () => success([], 'Reviews module stub'),
    });
};

export default fp(reviewsRoutes, { name: 'reviews-routes' });

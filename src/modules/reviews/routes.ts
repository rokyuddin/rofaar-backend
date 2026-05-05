import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { reviewService } from './service.js';
import { CreateReviewSchema, UpdateReviewSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';

const reviewsRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();

        // ─── Public Routes ────────────────────────────────────────────────────────

        app.get('/products/:id/reviews', {
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const [reviews, stats] = await Promise.all([
                    reviewService.listByProduct(request.params.id),
                    reviewService.getStats(request.params.id),
                ]);
                return success({ reviews, stats });
            },
        });
        app.post('/reviews/:id/helpful', {
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const result = await reviewService.voteHelpful(request.params.id);
                return success(result);
            },
        });

        // ─── Protected Routes (User) ──────────────────────────────────────────────

        app.post('/reviews', {
            preHandler: [fastify.authenticate],
            schema: { body: CreateReviewSchema },
            handler: async (request, reply) => {
                const result = await reviewService.create(request.user.id, request.body);
                return reply.code(201).send(success(result));
            },
        });

        app.put('/reviews/:id', {
            preHandler: [fastify.authenticate],
            schema: { params: IdParamSchema, body: UpdateReviewSchema },
            handler: async (request) => {
                const result = await reviewService.update(request.user.id, request.params.id, request.body);
                return success(result);
            },
        });

        app.delete('/reviews/:id', {
            preHandler: [fastify.authenticate],
            schema: { params: IdParamSchema },
            handler: async (request) => {
                await reviewService.delete(request.params.id, request.user.id);
                return success(null, 'Review deleted successfully');
            },
        });

        // ─── Admin Routes ─────────────────────────────────────────────────────────

        app.delete('/admin/reviews/:id', {
            preHandler: [fastify.requirePermission('delete', 'reviews')],
            schema: { params: IdParamSchema },
            handler: async (request) => {
                await reviewService.delete(request.params.id);
                return success(null, 'Review deleted by admin');
            },
        });
    });
};

export default fp(reviewsRoutes, { name: 'reviews-routes' });

import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { reviewService } from './service.js';
import { CreateReviewSchema, UpdateReviewSchema } from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const reviewRoutes: FastifyPluginAsync = async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Public Routes ─────────────────────────────────────────────────────────
    app.get('/products/:id/reviews', {
        schema: {
            tags: ['Reviews'],
            summary: 'List product reviews',
            params: IdParamSchema
        },
        handler: async (request, reply) => {
            const reviews = await reviewService.listByProduct(request.params.id);
            return reply.sendOk(reviews);
        },
    });

    app.post('/reviews/:id/helpful', {
        schema: {
            tags: ['Reviews'],
            summary: 'Mark review as helpful',
            params: IdParamSchema
        },
        handler: async (request, reply) => {
            await reviewService.markHelpful(request.params.id);
            return reply.sendOk(null, 'Marked as helpful');
        },
    });

    // ─── Protected Routes ───────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.post('/reviews', {
            schema: {
                tags: ['Reviews'],
                summary: 'Write a review',
                body: CreateReviewSchema
            },
            handler: async (request, reply) => {
                const review = await reviewService.create(request.user.id, request.body);
                return reply.sendCreated(review);
            },
        });

        app.put('/reviews/:id', {
            schema: {
                tags: ['Reviews'],
                summary: 'Update own review',
                params: IdParamSchema,
                body: UpdateReviewSchema
            },
            handler: async (request, reply) => {
                const review = await reviewService.update(request.user.id, request.params.id, request.body);
                return reply.sendOk(review);
            },
        });

        app.delete('/reviews/:id', {
            schema: {
                tags: ['Reviews'],
                summary: 'Delete own review',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                await reviewService.delete(request.user.id, request.params.id);
                return reply.sendOk(null, 'Review deleted successfully');
            },
        });
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.get('/', {
            preHandler: [fastify.requirePermission('read', 'reviews')],
            schema: {
                tags: ['Admin | Reviews'],
                summary: 'List all reviews (Admin)',
            },
            handler: async (_request, reply) => {
                const reviews = await reviewService.adminList();
                return reply.sendOk(reviews);
            },
        });

        app.delete('/:id', {
            preHandler: [fastify.requirePermission('delete', 'reviews')],
            schema: {
                tags: ['Admin | Reviews'],
                summary: 'Delete review (Admin)',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                await reviewService.adminDelete(request.params.id);
                return reply.sendOk(null, 'Review deleted by admin');
            },
        });
    }, { prefix: '/admin/reviews' });
};

export default reviewRoutes;

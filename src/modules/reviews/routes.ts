import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { reviewService } from './service.js';
import { success, paginated } from '@/shared/response.js';
import { createSwaggerConfig } from '@/shared/swagger.js';
import { IdParamSchema } from '@/shared/types.js';
import {
    CreateReviewSchema,
    ReviewPaginationSchema,
    DeleteReviewSchema,
} from './schema.js';
import type {
    CreateReviewBody,
    ReviewPaginationQuery,
    DeleteReviewBody,
} from './schema.js';

const reviewsRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── User Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();

        // POST /reviews/create
        app.post('/create', {
            preHandler: [fastify.authenticate],
            schema: {
                ...createSwaggerConfig(['User | Reviews'], 'Create Review', 'Submit a product review', true),
                body: CreateReviewSchema,
            },
            handler: async (request, reply) => {
                const review = await reviewService.create(request.user.id, request.body as CreateReviewBody);
                return reply.code(201).send(success(review, 'Review submitted successfully'));
            },
        });

        // GET /reviews/product/:id
        app.get('/product/:id', {
            schema: {
                ...createSwaggerConfig(['User | Reviews'], 'Product Reviews', 'Get all reviews for a product', false),
                params: IdParamSchema,
            },
            handler: async (request) => {
                const result = await reviewService.listByProduct(request.params.id);
                return success(result);
            },
        });

        // GET /reviews/mine
        app.get('/mine', {
            preHandler: [fastify.authenticate],
            schema: {
                ...createSwaggerConfig(['User | Reviews'], 'My Reviews', 'Get current user\'s review history', true),
            },
            handler: async (request) => {
                const result = await reviewService.listUserReviews(request.user.id);
                return success(result);
            },
        });
    }, { prefix: '/reviews' });

    // ─── Admin Routes ────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.adminOnly);

        // GET /admin/reviews/list
        app.get('/list', {
            schema: {
                ...createSwaggerConfig(['Admin | Reviews'], 'List All Reviews', 'Get all reviews with pagination', true),
                querystring: ReviewPaginationSchema,
            },
            handler: async (request) => {
                const query = request.query as ReviewPaginationQuery;
                const { rows, total } = await reviewService.listAll(query);
                return paginated(rows, {
                    page: query.page,
                    limit: query.limit,
                    total,
                });
            },
        });

        // GET /admin/reviews/recent
        app.get('/recent', {
            schema: {
                ...createSwaggerConfig(['Admin | Reviews'], 'Recent Reviews', 'Get recent reviews for dashboard', true),
            },
            handler: async () => {
                const result = await reviewService.getRecentReviews();
                return success(result);
            },
        });

        // DELETE /admin/reviews/delete
        app.delete('/delete', {
            schema: {
                ...createSwaggerConfig(['Admin | Reviews'], 'Delete Review', 'Remove a review', true),
                body: DeleteReviewSchema,
            },
            handler: async (request) => {
                const { id } = request.body as DeleteReviewBody;
                await reviewService.delete(id);
                return success(null, 'Review deleted');
            },
        });
    }, { prefix: '/admin/reviews' });
};

export default reviewsRoutes;

import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { productService } from './service.js';
import { recommendationService } from './recommendations.service.js';
import { ProductParamsSchema, CreateProductSchema, UpdateProductSchema } from './schema.js';
import { success, paginated } from '@/shared/response.js';
import { SlugParamSchema, IdParamSchema } from '@/shared/types.js';

const productsPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();

        // ─── Public Routes ────────────────────────────────────────────────────────

        app.get('/products', {
            schema: {
                querystring: ProductParamsSchema,
            },
            handler: async (request) => {
                const { rows, total } = await productService.list(request.query);
                return paginated(rows, {
                    page: request.query.page,
                    limit: request.query.limit,
                    total
                });
            },
        });

        app.get('/products/:slug', {
            schema: { params: SlugParamSchema },
            handler: async (request) => {
                const product = await productService.getBySlug(request.params.slug);
                
                // Log view (async background)
                const userId = (request as any).user?.id;
                recommendationService.logView(userId, product.id).catch(console.error);

                return success(product);
            },
        });

        app.get('/products/:id/related', {
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const related = await recommendationService.getRelatedProducts(request.params.id);
                return success(related);
            },
        });

        app.get('/products/recently-viewed', {
            onRequest: [fastify.authenticate],
            handler: async (request) => {
                const recent = await recommendationService.getRecentlyViewed(request.user.id);
                return success(recent);
            },
        });

        // ─── Admin Routes ─────────────────────────────────────────────────────────

        app.post('/admin/products', {
            preHandler: [fastify.requirePermission('create', 'products')],
            schema: { body: CreateProductSchema },
            handler: async (request, reply) => {
                const product = await productService.create(request.body);
                return reply.code(201).send(success(product));
            },
        });

        app.put('/admin/products/:id', {
            preHandler: [fastify.requirePermission('update', 'products')],
            schema: { params: IdParamSchema, body: UpdateProductSchema },
            handler: async (request) => {
                const product = await productService.update(request.params.id, request.body);
                return success(product);
            },
        });

        app.delete('/admin/products/:id', {
            preHandler: [fastify.requirePermission('delete', 'products')],
            schema: { params: IdParamSchema },
            handler: async (request) => {
                await productService.delete(request.params.id);
                return success(null, 'Product deleted successfully');
            },
        });
    });
};

export default fp(productsPlugin, { name: 'product-routes' });

import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { productService } from './service.js';
import { recommendationService } from './recommendations.service.js';
import {
    ProductParamsSchema,
    SlugParamSchema,
    AdminProductParamsSchema,
    CreateProductSchema,
    UpdateProductSchema,
} from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const productRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Public Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();

        app.get('/', {
            schema: {
                tags: ['Products'],
                summary: 'List products',
                description: 'Returns a paginated list of products with optional filters for search, category, brand, and price.',
                querystring: ProductParamsSchema
            },
            handler: async (request, reply) => {
                const { rows, total } = await productService.list(request.query);
                return reply.sendPaginated(rows, {
                    page: request.query.page,
                    limit: request.query.limit,
                    total,
                });
            },
        });

        app.get('/:slug', {
            schema: {
                tags: ['Products'],
                summary: 'Get product detail',
                description: 'Returns the detailed information of a product identified by its unique slug.',
                params: SlugParamSchema
            },
            handler: async (request, reply) => {
                const product = await productService.getBySlug(request.params.slug);
                const userId = (request as { user?: { id: string } }).user?.id;
                recommendationService.logView(userId, product.id).catch(console.error);
                return reply.sendOk(product);
            },
        });

        app.get('/:id/related', {
            schema: {
                tags: ['Products'],
                summary: 'Get related products',
                description: 'Returns a list of products related to the specified product ID.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                const related = await recommendationService.getRelatedProducts(request.params.id);
                return reply.sendOk(related);
            },
        });

        app.get('/recently-viewed', {
            onRequest: [fastify.authenticate],
            schema: {
                tags: ['Products'],
                summary: 'Get recently viewed products',
                description: 'Returns a list of products recently viewed by the authenticated user.',
            },
            handler: async (request, reply) => {
                const recent = await recommendationService.getRecentlyViewed(request.user.id);
                return reply.sendOk(recent);
            },
        });
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.get('/admin', {
            preHandler: [fastify.requirePermission('read', 'products')],
            schema: {
                tags: ['Admin | Products'],
                summary: 'List products (Admin)',
                description: 'Returns a paginated list of all products, including inactive ones.',
                querystring: AdminProductParamsSchema
            },
            handler: async (request, reply) => {
                const { rows, total } = await productService.adminList(request.query);
                return reply.sendPaginated(rows, {
                    page: request.query.page,
                    limit: request.query.limit,
                    total,
                });
            },
        });

        app.post('/create', {
            preHandler: [fastify.requirePermission('create', 'products')],
            schema: {
                tags: ['Admin | Products'],
                summary: 'Create product',
                description: 'Creates a new product in the catalog.',
                body: CreateProductSchema
            },
            handler: async (request, reply) => {
                const product = await productService.create(request.body);
                return reply.sendCreated(product);
            },
        });

        app.put('/update/:id', {
            preHandler: [fastify.requirePermission('update', 'products')],
            schema: {
                tags: ['Admin | Products'],
                summary: 'Update product',
                description: 'Updates an existing product in the catalog.',
                params: IdParamSchema,
                body: UpdateProductSchema
            },
            handler: async (request, reply) => {
                const product = await productService.update(request.params.id, request.body);
                return reply.sendOk(product);
            },
        });

        app.delete('/delete/:id', {
            preHandler: [fastify.requirePermission('delete', 'products')],
            schema: {
                tags: ['Admin | Products'],
                summary: 'Delete product',
                description: 'Permanently deletes a product from the catalog.',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                await productService.delete(request.params.id);
                return reply.sendOk(null, 'Product deleted successfully');
            },
        });
    }, { prefix: '/admin/products' });
};

export default productRoutes;

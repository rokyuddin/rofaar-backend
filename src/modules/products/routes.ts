import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { productService } from './service.js';
import { ProductParamsSchema, CreateProductSchema, UpdateProductSchema } from './schema.js';
import { success, paginated } from '@/shared/response.js';
import { SlugParamSchema, IdParamSchema } from '@/shared/types.js';

const productsPlugin: FastifyPluginAsync = async (fastify) => {
    // ─── Public Routes ───────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();

    // ─── Public Routes ────────────────────────────────────────────────────────

    f.get('/products', {
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

    f.get('/products/:slug', {
        schema: { params: SlugParamSchema },
        handler: async (request) => {
            const product = await productService.getBySlug(request.params.slug);
            return success(product);
        },
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────

    f.post('/admin/products', {
        preHandler: [fastify.requirePermission('create', 'products')],
        schema: { body: CreateProductSchema },
        handler: async (request, reply) => {
            const product = await productService.create(request.body);
            return reply.code(201).send(success(product));
        },
    });

    f.put('/admin/products/:id', {
        preHandler: [fastify.requirePermission('update', 'products')],
        schema: { params: IdParamSchema, body: UpdateProductSchema },
        handler: async (request) => {
            const product = await productService.update(request.params.id, request.body);
            return success(product);
        },
    });

    f.delete('/admin/products/:id', {
        preHandler: [fastify.requirePermission('delete', 'products')],
        schema: { params: IdParamSchema },
        handler: async (request) => {
            await productService.delete(request.params.id);
            return success(null, 'Product deleted successfully');
        },
    });
};

export default fp(productsPlugin, { name: 'product-routes' });

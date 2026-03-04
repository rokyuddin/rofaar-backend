import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { productService } from './service.js';
import {
    ProductParamsSchema,
    CreateProductSchema,
    UpdateProductSchema,
    DeleteProductSchema
} from './schema.js';
import type {
    CreateProductBody,
    UpdateProductBody,
    DeleteProductBody
} from './schema.js';
import { success, paginated } from '@/shared/response.js';
import { NotFoundError } from '@/shared/errors.js';
import { SlugParamSchema } from '@/shared/types.js';
import { createSwaggerConfig } from '@/shared/swagger.js';

const productsPlugin: FastifyPluginAsync = async (fastify) => {
    // ─── Public Routes ───────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();

        // GET /products/list
        app.get('/list', {
            schema: {
                ...createSwaggerConfig(['Products'], 'List Products', 'Get paginated list of products with filtering options', false),
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

        // GET /products/:slug
        app.get('/:slug', {
            schema: {
                ...createSwaggerConfig(['Products'], 'Get Product', 'Get single product by slug', false),
                params: SlugParamSchema,
            },
            handler: async (request) => {
                const product = await productService.getBySlug(request.params.slug);
                if (!product) throw new NotFoundError('Product');
                return success(product);
            },
        });
    }, { prefix: '/products' });

    // ─── Admin Routes ────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.adminOnly);

        app.post('/create', {
            schema: {
                body: CreateProductSchema,
                ...createSwaggerConfig(['Admin | Products'], 'Create Product', 'Create a new product', true),
            },
            handler: async (request, reply) => {
                const result = await productService.create(request.body as CreateProductBody);
                return reply.code(201).send(success(result));
            },
        });

        app.put('/update', {
            schema: {
                body: UpdateProductSchema,
                ...createSwaggerConfig(['Admin | Products'], 'Update Product', 'Update an existing product', true),
            },
            handler: async (request) => {
                const result = await productService.update(request.body as UpdateProductBody);
                if (!result) throw new NotFoundError('Product');
                return success(result);
            },
        });

        app.delete('/delete', {
            schema: {
                body: DeleteProductSchema,
                ...createSwaggerConfig(['Admin | Products'], 'Delete Product', 'Delete a product', true),
            },
            handler: async (request) => {
                const result = await productService.delete(request.body as DeleteProductBody);
                if (!result) throw new NotFoundError('Product');
                return success(result);
            },
        });
    }, { prefix: '/admin/products' });
};

export default productsPlugin;

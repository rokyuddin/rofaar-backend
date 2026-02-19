import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { productService } from './service.js';
import { ProductParamsSchema } from './schema.js';
import { success, paginated } from '@/shared/response.js';
import { NotFoundError } from '@/shared/errors.js';
import { SlugParamSchema } from '@/shared/types.js';

const productsPlugin: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // GET /products
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

    // GET /products/:slug
    f.get('/products/:slug', {
        schema: { params: SlugParamSchema },
        handler: async (request) => {
            const product = await productService.getBySlug(request.params.slug);
            if (!product) throw new NotFoundError('Product');
            return success(product);
        },
    });
};

export default fp(productsPlugin, { name: 'product-routes' });

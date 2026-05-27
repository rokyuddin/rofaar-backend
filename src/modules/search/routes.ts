import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db } from '@/config/db.js';
import { products } from '@/db/schema/product.js';
import { ilike, or, eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { searchService } from './service.js';
import { productSearchSchema } from './schema.js';

const searchRoutes: FastifyPluginAsync = async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    app.get('/autocomplete', {
        schema: {
            tags: ['Products'],
            summary: 'Search autocomplete',
            description: 'Returns up to 5 matching products for autocomplete suggestions.',
            querystring: z.object({ q: z.string().min(1) })
        },
        handler: async (request, reply) => {
            const results = await db.query.products.findMany({
                where: and(
                    eq(products.isActive, true),
                    or(
                        ilike(products.name, `%${request.query.q}%`),
                        ilike(products.description, `%${request.query.q}%`),
                    ),
                ),
                limit: 5,
                columns: { id: true, name: true, slug: true },
            });
            return reply.sendOk(results);
        },
    });

    app.get('/', {
        schema: {
            tags: ['Products'],
            summary: 'Advanced search',
            description: 'Performs a full product search with filtering and sorting.',
            querystring: productSearchSchema
        },
        handler: async (request, reply) => {
            const { data, meta } = await searchService.searchProducts(request.query);
            return reply.sendPaginated(data, {
                page: meta.page,
                limit: meta.limit,
                total: meta.total,
                totalPages: meta.totalPages,
            });
        },
    });
};

export default searchRoutes;

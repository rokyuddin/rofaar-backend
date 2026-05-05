import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db } from '@/config/db.js';
import { products } from '@/db/schema/product.js';
import { ilike, or } from 'drizzle-orm';
import { success } from '@/shared/response.js';
import { z } from 'zod';

const searchRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.get('/autocomplete', {
        schema: {
            querystring: z.object({ q: z.string().min(1) }),
        },
        handler: async (request) => {
            const query = request.query.q;
            const results = await db.query.products.findMany({
                where: or(
                    ilike(products.name, `%${query}%`),
                    ilike(products.description, `%${query}%`)
                ),
                limit: 5,
                columns: { id: true, name: true, slug: true },
            });
            return success(results);
        },
    });
};

export default searchRoutes;

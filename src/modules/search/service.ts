import { db } from '@/config/db.js';
import { products } from '@/db/schema/product.js';
import { orderItems } from '@/db/schema/order.js';
import { ilike, or, and, gte, lte, eq, desc, asc, count, sql, SQL } from 'drizzle-orm';
import type { ProductSearchInput } from './schema.js';

export class SearchService {
    async searchProducts(input: ProductSearchInput) {
        const { q, minPrice, maxPrice, categoryId, brandId, sortBy, page, limit } = input;
        
        const conditions: SQL[] = [];
        
        // Ensure only active products are shown
        conditions.push(eq(products.isActive, true));

        if (q) {
            conditions.push(
                or(
                    ilike(products.name, `%${q}%`),
                    ilike(products.description, `%${q}%`)
                )!
            );
        }

        if (minPrice !== undefined) conditions.push(gte(products.price, String(minPrice)));
        if (maxPrice !== undefined) conditions.push(lte(products.price, String(maxPrice)));
        if (categoryId) conditions.push(eq(products.categoryId, categoryId));
        if (brandId) conditions.push(eq(products.brandId, brandId));

        const queryConditions = and(...conditions);

        // Sorting logic
        let orderByClause;
        
        if (sortBy === 'price_asc') {
            orderByClause = asc(products.price);
        } else if (sortBy === 'price_desc') {
            orderByClause = desc(products.price);
        } else if (sortBy === 'newest') {
            orderByClause = desc(products.createdAt);
        } else {
            orderByClause = desc(products.createdAt); // Fallback
        }

        const offset = (page - 1) * limit;

        const results = await db.query.products.findMany({
            where: queryConditions,
            limit,
            offset,
            orderBy: [orderByClause],
            with: {
                brand: { columns: { name: true } },
                category: { columns: { name: true } },
            }
        });

        // Get total count for pagination
        const [totalCount] = await db.select({ value: count() }).from(products).where(queryConditions);

        return {
            data: results,
            meta: {
                total: Number(totalCount?.value ?? 0),
                page,
                limit,
                totalPages: Math.ceil(Number(totalCount?.value ?? 0) / limit),
            }
        };
    }
}

export const searchService = new SearchService();

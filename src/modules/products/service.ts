import { eq, and, gte, lte, ilike, count, sql } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { products } from '@/db/schema/product.js';

export class ProductService {
    async list(filters: {
        page: number;
        limit: number;
        minPrice?: number;
        maxPrice?: number;
        search?: string;
    }) {
        const { page, limit, minPrice, maxPrice, search } = filters;
        const offset = (page - 1) * limit;

        const conditions = [eq(products.isActive, true)];
        if (minPrice !== undefined) conditions.push(gte(sql`CAST(${products.price} AS NUMERIC)`, minPrice));
        if (maxPrice !== undefined) conditions.push(lte(sql`CAST(${products.price} AS NUMERIC)`, maxPrice));
        if (search) conditions.push(ilike(products.name, `%${search}%`));

        const [rows, totalResult] = await Promise.all([
            db.query.products.findMany({
                where: and(...conditions),
                with: { category: true, images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] } },
                limit,
                offset,
            }),
            db.select({ value: count() }).from(products).where(and(...conditions)),
        ]);

        return {
            rows,
            total: Number(totalResult[0]?.value ?? 0),
        };
    }

    async getBySlug(slug: string) {
        return db.query.products.findFirst({
            where: eq(products.slug, slug),
            with: {
                category: true,
                images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
                tags: { with: { tag: true } },
            },
        });
    }
}

export const productService = new ProductService();

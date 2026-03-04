import { eq, and, gte, lte, ilike, count, sql } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { products, productImages } from '@/db/schema/product.js';
import type { CreateProductBody, UpdateProductBody, DeleteProductBody } from './schema.js';

export class ProductService {
    async list(filters: {
        page: number;
        limit: number;
        minPrice?: number | undefined;
        maxPrice?: number | undefined;
        search?: string | undefined;
        category?: string | undefined;
        tag?: string | undefined;
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

    async create(data: CreateProductBody) {
        return await db.transaction(async (tx) => {
            const [product] = await tx.insert(products).values({
                name: data.name,
                slug: data.slug,
                description: data.description,
                price: data.price,
                stock: data.stock,
                categoryId: data.categoryId,
            }).returning();

            if (data.images?.length) {
                await tx.insert(productImages).values(
                    data.images.map((img) => ({
                        productId: product!.id,
                        url: img.url,
                        sortOrder: img.sortOrder,
                    }))
                );
            }

            return product;
        });
    }

    async update(data: UpdateProductBody) {
        return await db.transaction(async (tx) => {
            const { id, images, ...updateData } = data;
            const [product] = await tx.update(products)
                .set(updateData)
                .where(eq(products.id, id))
                .returning();

            if (!product) return null;

            if (images !== undefined) {
                await tx.delete(productImages).where(eq(productImages.productId, id));
                if (images.length) {
                    await tx.insert(productImages).values(
                        images.map((img) => ({
                            productId: id,
                            url: img.url,
                            sortOrder: img.sortOrder,
                        }))
                    );
                }
            }

            return product;
        });
    }

    async delete(data: DeleteProductBody) {
        const [product] = await db.delete(products)
            .where(eq(products.id, data.id))
            .returning();
        return product;
    }
}

export const productService = new ProductService();

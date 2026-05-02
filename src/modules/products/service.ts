import { eq, and, gte, lte, ilike, count, sql, desc, asc } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { products, productImages } from '@/db/schema/product.js';
import { NotFoundError } from '@/shared/errors.js';

export class ProductService {
    async list(filters: {
        page: number;
        limit: number;
        category?: string;
        brand?: string;
        minPrice?: number;
        maxPrice?: number;
        search?: string;
        sort?: 'newest' | 'price-low' | 'price-high' | 'popular';
    }) {
        const { page, limit, category, brand, minPrice, maxPrice, search, sort } = filters;
        const offset = (page - 1) * limit;

        const conditions = [eq(products.isActive, true)];
        if (category) conditions.push(eq(products.categoryId, category));
        if (brand) conditions.push(eq(products.brandId, brand));
        if (minPrice !== undefined) conditions.push(gte(sql`CAST(${products.price} AS NUMERIC)`, minPrice));
        if (maxPrice !== undefined) conditions.push(lte(sql`CAST(${products.price} AS NUMERIC)`, maxPrice));
        if (search) conditions.push(ilike(products.name, `%${search}%`));

        let orderBy;
        switch (sort) {
            case 'price-low':
                orderBy = [asc(products.price)];
                break;
            case 'price-high':
                orderBy = [desc(products.price)];
                break;
            case 'popular':
                // For now, sorting by stock as a placeholder for popularity
                orderBy = [desc(products.stock)];
                break;
            case 'newest':
            default:
                orderBy = [desc(products.createdAt)];
                break;
        }

        const [rows, totalResult] = await Promise.all([
            db.query.products.findMany({
                where: and(...conditions),
                with: { 
                    category: true, 
                    brand: true,
                    images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] } 
                },
                limit,
                offset,
                orderBy,
            }),
            db.select({ value: count() }).from(products).where(and(...conditions)),
        ]);

        return {
            rows,
            total: Number(totalResult[0]?.value ?? 0),
        };
    }

    async getBySlug(slug: string) {
        const product = await db.query.products.findFirst({
            where: eq(products.slug, slug),
            with: {
                category: true,
                brand: true,
                images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
                tags: { with: { tag: true } },
            },
        });
        if (!product) throw new NotFoundError('Product');
        return product;
    }

    async create(data: any) {
        const { images, ...productData } = data;
        
        return await db.transaction(async (tx) => {
            const [product] = await tx.insert(products).values(productData).returning();
            
            if (images && images.length > 0) {
                await tx.insert(productImages).values(
                    images.map((img: any) => ({
                        productId: product!.id,
                        url: img.url,
                        sortOrder: img.sortOrder
                    }))
                );
            }
            
            return this.getById(product!.id);
        });
    }

    async update(id: string, data: any) {
        const { images, ...productData } = data;
        
        return await db.transaction(async (tx) => {
            const [product] = await tx
                .update(products)
                .set({ ...productData, updatedAt: new Date() })
                .where(eq(products.id, id))
                .returning();
            
            if (!product) throw new NotFoundError('Product');

            if (images) {
                // Simplified: Replace all images
                await tx.delete(productImages).where(eq(productImages.productId, id));
                if (images.length > 0) {
                    await tx.insert(productImages).values(
                        images.map((img: any) => ({
                            productId: id,
                            url: img.url,
                            sortOrder: img.sortOrder
                        }))
                    );
                }
            }
            
            return this.getById(id);
        });
    }

    async delete(id: string) {
        const [product] = await db.delete(products).where(eq(products.id, id)).returning();
        if (!product) throw new NotFoundError('Product');
        return product;
    }

    async getById(id: string) {
        return db.query.products.findFirst({
            where: eq(products.id, id),
            with: {
                category: true,
                brand: true,
                images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
            },
        });
    }
}

export const productService = new ProductService();

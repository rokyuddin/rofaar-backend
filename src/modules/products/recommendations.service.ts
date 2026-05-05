import { db } from '@/config/db.js';
import { productViews } from '@/db/schema/product_view.js';
import { products } from '@/db/schema/product.js';
import { eq, desc, ne, and } from 'drizzle-orm';

export class RecommendationService {
    async logView(userId: string | null | undefined, productId: string) {
        await db.insert(productViews).values({
            userId: userId || null,
            productId,
        });
    }

    async getRecentlyViewed(userId: string) {
        const views = await db.query.productViews.findMany({
            where: eq(productViews.userId, userId),
            with: { product: { with: { images: true } } },
            orderBy: [desc(productViews.viewedAt)],
            limit: 20,
        });

        // Deduplicate
        const uniqueProducts = [];
        const seenIds = new Set();
        for (const v of views) {
            if (!seenIds.has(v.productId)) {
                uniqueProducts.push(v.product);
                seenIds.add(v.productId);
            }
            if (uniqueProducts.length >= 10) break;
        }
        return uniqueProducts;
    }

    async getRelatedProducts(productId: string) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
        });
        if (!product) return [];

        return db.query.products.findMany({
            where: and(
                eq(products.categoryId, product.categoryId || ''),
                ne(products.id, productId),
                eq(products.isActive, true)
            ),
            limit: 6,
            with: { images: true },
        });
    }
}

export const recommendationService = new RecommendationService();

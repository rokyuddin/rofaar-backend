import { eq, and, desc, count, avg } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { reviews } from '@/db/schema/review.js';
import { products } from '@/db/schema/product.js';
import { NotFoundError } from '@/shared/errors.js';

export class ReviewService {
    async listByProduct(productId: string) {
        return db.query.reviews.findMany({
            where: eq(reviews.productId, productId),
            with: { user: { columns: { name: true } } },
            orderBy: [desc(reviews.createdAt)],
        });
    }

    async getStats(productId: string) {
        const stats = await db
            .select({
                averageRating: avg(reviews.rating),
                totalReviews: count(reviews.id),
            })
            .from(reviews)
            .where(eq(reviews.productId, productId));
        
        return {
            averageRating: Number(stats[0]?.averageRating ?? 0).toFixed(1),
            totalReviews: Number(stats[0]?.totalReviews ?? 0),
        };
    }

    async create(userId: string, data: { productId: string; rating: number; comment?: string }) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, data.productId),
        });
        if (!product) throw new NotFoundError('Product');

        const [review] = await db
            .insert(reviews)
            .values({ ...data, userId })
            .returning();
        
        return review!;
    }

    async update(userId: string, id: string, data: any) {
        const [review] = await db
            .update(reviews)
            .set({ ...data, updatedAt: new Date() })
            .where(and(eq(reviews.id, id), eq(reviews.userId, userId)))
            .returning();
        
        if (!review) throw new NotFoundError('Review');
        return review;
    }

    async delete(id: string, userId?: string) {
        const conditions = [eq(reviews.id, id)];
        if (userId) conditions.push(eq(reviews.userId, userId));

        const [review] = await db
            .delete(reviews)
            .where(and(...conditions))
            .returning();
        
        if (!review) throw new NotFoundError('Review');
        return review;
    }
}

export const reviewService = new ReviewService();

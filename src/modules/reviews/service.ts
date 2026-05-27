import { eq, and, desc, count, avg, sql } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { reviews } from '@/db/schema/review.js';
import { products } from '@/db/schema/product.js';
import { orders, orderItems } from '@/db/schema/order.js';
import { NotFoundError, BadRequestError } from '@/shared/errors.js';
import type { CreateReview, UpdateReview } from './schema.js';

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

    async adminList() {
        return db.query.reviews.findMany({
            with: {
                user: { columns: { id: true, name: true } },
                product: { columns: { id: true, name: true, slug: true } },
            },
            orderBy: [desc(reviews.createdAt)],
        });
    }

    async create(userId: string, data: CreateReview) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, data.productId),
        });
        if (!product) throw new NotFoundError('Product');

        const existing = await db.query.reviews.findFirst({
            where: and(eq(reviews.userId, userId), eq(reviews.productId, data.productId)),
        });
        if (existing) throw new BadRequestError('You have already reviewed this product');

        const purchase = await db
            .select({ id: orders.id })
            .from(orders)
            .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
            .where(
                and(
                    eq(orders.userId, userId),
                    eq(orderItems.productId, data.productId),
                    eq(orders.status, 'delivered'),
                ),
            )
            .limit(1);

        const isVerifiedPurchase = purchase.length > 0;

        const [review] = await db
            .insert(reviews)
            .values({ ...data, userId, isVerifiedPurchase })
            .returning();

        return review!;
    }

    async voteHelpful(id: string) {
        const [review] = await db
            .update(reviews)
            .set({ helpfulVotes: sql`${reviews.helpfulVotes} + 1` })
            .where(eq(reviews.id, id))
            .returning();

        if (!review) throw new NotFoundError('Review');
        return review;
    }

    async update(userId: string, id: string, data: UpdateReview) {
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

import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { reviews } from '@/db/schema/review.js';
import { NotFoundError } from '@/shared/errors.js';
import type { CreateReviewBody, ReviewPaginationQuery } from './schema.js';

export class ReviewService {
    // ─── User Methods ────────────────────────────────────────────────────────

    async create(userId: string, data: CreateReviewBody) {
        const [review] = await db
            .insert(reviews)
            .values({
                userId,
                productId: data.productId,
                rating: data.rating,
                comment: data.comment,
            })
            .returning();

        return review!;
    }

    async listByProduct(productId: string) {
        return db.query.reviews.findMany({
            where: eq(reviews.productId, productId),
            with: { user: true },
            orderBy: [desc(reviews.createdAt)],
        });
    }

    async listUserReviews(userId: string) {
        return db.query.reviews.findMany({
            where: eq(reviews.userId, userId),
            with: { product: true },
            orderBy: [desc(reviews.createdAt)],
        });
    }

    // ─── Admin Methods ───────────────────────────────────────────────────────

    async listAll(params: ReviewPaginationQuery) {
        const { page = 1, limit = 10, productId, rating } = params;
        const offset = (page - 1) * limit;

        const where = and(
            productId ? eq(reviews.productId, productId) : undefined,
            rating ? eq(reviews.rating, rating) : undefined
        );

        const [rows, [totalResult]] = await Promise.all([
            db.query.reviews.findMany({
                where,
                limit,
                offset,
                with: { user: true, product: true },
                orderBy: [desc(reviews.createdAt)],
            }),
            db.select({ count: count() }).from(reviews).where(where),
        ]);

        return { rows, total: totalResult?.count ?? 0 };
    }

    async getRecentReviews(limit = 10) {
        return db.query.reviews.findMany({
            limit,
            with: { user: true, product: true },
            orderBy: [desc(reviews.createdAt)],
        });
    }

    async delete(id: string) {
        const [review] = await db
            .delete(reviews)
            .where(eq(reviews.id, id))
            .returning();

        if (!review) throw new NotFoundError('Review');
        return review;
    }
}

export const reviewService = new ReviewService();

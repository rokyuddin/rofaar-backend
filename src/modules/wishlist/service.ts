import { eq, and } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { wishlistItems } from '@/db/schema/wishlist.js';

export class WishlistService {
    async get(userId: string) {
        return db.query.wishlistItems.findMany({
            where: eq(wishlistItems.userId, userId),
            with: { product: { with: { images: true } } },
        });
    }

    async addItem(userId: string, productId: string) {
        const [item] = await db
            .insert(wishlistItems)
            .values({ userId, productId })
            .onConflictDoNothing()
            .returning();
        return item;
    }

    async removeItem(userId: string, productId: string) {
        await db
            .delete(wishlistItems)
            .where(and(eq(wishlistItems.productId, productId), eq(wishlistItems.userId, userId)));
    }
}

export const wishlistService = new WishlistService();

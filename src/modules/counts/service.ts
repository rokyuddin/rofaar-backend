import { eq, sql } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { cartItems } from '@/db/schema/cart.js';
import { wishlistItems } from '@/db/schema/wishlist.js';

export class CountsService {
    async getCounts(userId: string) {
        const [cartResult, wishlistResult] = await Promise.all([
            db
                .select({ count: sql<number>`count(*)::int` })
                .from(cartItems)
                .where(eq(cartItems.userId, userId)),
            db
                .select({ count: sql<number>`count(*)::int` })
                .from(wishlistItems)
                .where(eq(wishlistItems.userId, userId)),
        ]);

        return {
            cart: cartResult[0]?.count ?? 0,
            wishlist: wishlistResult[0]?.count ?? 0,
        };
    }
}

export const countsService = new CountsService();

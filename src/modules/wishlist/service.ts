import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { wishlistItems } from '@/db/schema/wishlist.js';
import { cartItems } from '@/db/schema/cart.js';
import { products } from '@/db/schema/product.js';
import { NotFoundError, BadRequestError } from '@/shared/errors.js';

export class WishlistService {
    async get(userId: string) {
        return db.query.wishlistItems.findMany({
            where: eq(wishlistItems.userId, userId),
            with: { product: { with: { images: true } } },
        });
    }

    async addItem(userId: string, productId: string) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
        });
        if (!product) throw new NotFoundError('Product');

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

    async moveToCart(userId: string, productId: string) {
        return await db.transaction(async (tx) => {
            const product = await tx.query.products.findFirst({
                where: eq(products.id, productId),
            });

            if (!product) throw new NotFoundError('Product');
            if (product.stock < 1) throw new BadRequestError('Insufficient stock');

            // Add to cart
            await tx
                .insert(cartItems)
                .values({
                    userId,
                    productId,
                    quantity: 1,
                    price: product.price,
                })
                .onConflictDoUpdate({
                    target: [cartItems.userId, cartItems.productId],
                    set: { quantity: sql`${cartItems.quantity} + 1`, price: product.price },
                });

            // Remove from wishlist
            await tx
                .delete(wishlistItems)
                .where(and(eq(wishlistItems.productId, productId), eq(wishlistItems.userId, userId)));
        });
    }

    async moveAllToCart(userId: string) {
        return await db.transaction(async (tx) => {
            const items = await tx.query.wishlistItems.findMany({
                where: eq(wishlistItems.userId, userId),
                with: { product: true },
            });

            for (const item of items) {
                if (item.product.stock >= 1) {
                    await tx
                        .insert(cartItems)
                        .values({
                            userId,
                            productId: item.productId,
                            quantity: 1,
                            price: item.product.price,
                        })
                        .onConflictDoUpdate({
                            target: [cartItems.userId, cartItems.productId],
                            set: { quantity: sql`${cartItems.quantity} + 1`, price: item.product.price },
                        });
                }
            }

            await tx.delete(wishlistItems).where(eq(wishlistItems.userId, userId));
        });
    }
}

export const wishlistService = new WishlistService();

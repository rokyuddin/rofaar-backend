import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { wishlistItems } from '@/db/schema/wishlist.js';
import { cartItems } from '@/db/schema/cart.js';
import { products } from '@/db/schema/product.js';
import { productVariants } from '@/db/schema/productVariant.js';
import { NotFoundError, BadRequestError } from '@/shared/errors.js';

export class WishlistService {
    /**
     * Resolve the default variant for a product. Used by moveToCart because
     * cart_items.variant_id is strictly required.
     */
    private async getDefaultVariant(productId: string, tx: any = db) {
        const v = await tx.query.productVariants.findFirst({
            where: and(eq(productVariants.productId, productId), eq(productVariants.isDefault, true)),
        });
        if (!v) throw new BadRequestError(`No default variant found for product ${productId}`);
        return v;
    }

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

            const variant = await this.getDefaultVariant(productId, tx);
            const price = (variant.salePrice ?? variant.basePrice).toString();

            // Add to cart (upsert by userId+variantId)
            const existing = await tx.query.cartItems.findFirst({
                where: and(eq(cartItems.userId, userId), eq(cartItems.variantId, variant.id)),
            });
            if (existing) {
                await tx
                    .update(cartItems)
                    .set({
                        quantity: sql`${cartItems.quantity} + 1`,
                        price,
                        updatedAt: new Date(),
                    })
                    .where(eq(cartItems.id, existing.id));
            } else {
                await tx.insert(cartItems).values({
                    userId,
                    productId,
                    variantId: variant.id,
                    quantity: 1,
                    price,
                });
            }

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
                    const variant = await this.getDefaultVariant(item.productId, tx);
                    const price = (variant.salePrice ?? variant.basePrice).toString();
                    const existing = await tx.query.cartItems.findFirst({
                        where: and(eq(cartItems.userId, userId), eq(cartItems.variantId, variant.id)),
                    });
                    if (existing) {
                        await tx
                            .update(cartItems)
                            .set({
                                quantity: sql`${cartItems.quantity} + 1`,
                                price,
                                updatedAt: new Date(),
                            })
                            .where(eq(cartItems.id, existing.id));
                    } else {
                        await tx.insert(cartItems).values({
                            userId,
                            productId: item.productId,
                            variantId: variant.id,
                            quantity: 1,
                            price,
                        });
                    }
                }
            }

            await tx.delete(wishlistItems).where(eq(wishlistItems.userId, userId));
        });
    }

    /**
     * Sync local wishlist items with the backend.
     * Silently skips duplicates and invalid products.
     */
    async sync(userId: string, items: Array<{ productId: string }>) {
        const synced: Array<{ id: string; productId: string; createdAt: Date }> = [];
        const skipped: Array<{ productId: string; reason: string }> = [];

        await db.transaction(async (tx) => {
            for (const item of items) {
                const product = await tx.query.products.findFirst({
                    where: eq(products.id, item.productId),
                });
                if (!product) {
                    skipped.push({ productId: item.productId, reason: "Product not found" });
                    continue;
                }

                const [inserted] = await tx
                    .insert(wishlistItems)
                    .values({ userId, productId: item.productId })
                    .onConflictDoNothing()
                    .returning();

                if (inserted) {
                    synced.push({ id: inserted.id, productId: inserted.productId, createdAt: inserted.createdAt });
                }
                // Duplicate (conflict) — silently skipped, not added to skipped list
            }
        });

        return { synced, skipped };
    }
}

export const wishlistService = new WishlistService();

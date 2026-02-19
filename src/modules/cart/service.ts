import { eq, and } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { cartItems } from '@/db/schema/cart.js';
import { products } from '@/db/schema/product.js';
import { NotFoundError, BadRequestError } from '@/shared/errors.js';

export class CartService {
    async get(userId: string) {
        return db.query.cartItems.findMany({
            where: eq(cartItems.userId, userId),
            with: { product: { with: { images: true } } },
        });
    }

    async addItem(userId: string, data: { productId: string; quantity: number }) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, data.productId),
        });

        if (!product) throw new NotFoundError('Product');
        if (product.stock < data.quantity) throw new BadRequestError('Insufficient stock');

        const [item] = await db
            .insert(cartItems)
            .values({
                userId,
                productId: data.productId,
                quantity: data.quantity,
                price: product.price,
            })
            .onConflictDoUpdate({
                target: [cartItems.userId, cartItems.productId],
                set: { quantity: data.quantity, price: product.price },
            })
            .returning();

        return item!;
    }

    async updateItem(userId: string, productId: string, quantity: number) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
        });

        if (!product) throw new NotFoundError('Product');
        if (product.stock < quantity) throw new BadRequestError('Insufficient stock');

        const [item] = await db
            .update(cartItems)
            .set({ quantity, price: product.price })
            .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
            .returning();

        if (!item) throw new NotFoundError('Cart item');
        return item;
    }

    async removeItem(userId: string, productId: string) {
        await db
            .delete(cartItems)
            .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
    }
}

export const cartService = new CartService();

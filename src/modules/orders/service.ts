import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { orders, orderItems } from '@/db/schema/order.js';
import { cartItems } from '@/db/schema/cart.js';
import { products } from '@/db/schema/product.js';
import { coupons } from '@/db/schema/coupon.js';
import { NotFoundError, BadRequestError } from '@/shared/errors.js';

export class OrderService {
    async list(userId: string) {
        return db.query.orders.findMany({
            where: eq(orders.userId, userId),
            with: { items: { with: { product: true } }, address: true },
            orderBy: (o, { desc }) => [desc(o.createdAt)],
        });
    }

    async getById(userId: string, orderId: string) {
        const order = await db.query.orders.findFirst({
            where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
            with: { items: { with: { product: true } }, address: true, coupon: true },
        });
        if (!order) throw new NotFoundError('Order');
        return order;
    }

    async create(userId: string, data: { addressId: string; paymentMethod: any; couponCode?: string }) {
        const { addressId, paymentMethod, couponCode } = data;

        const cart = await db.query.cartItems.findMany({
            where: eq(cartItems.userId, userId),
            with: { product: true },
        });

        if (!cart.length) throw new BadRequestError('Cart is empty');

        let subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
        let discountAmount = 0;
        let couponId: string | null = null;

        if (couponCode) {
            const coupon = await db.query.coupons.findFirst({
                where: and(eq(coupons.code, couponCode), eq(coupons.isActive, true)),
            });
            if (!coupon) throw new BadRequestError('Invalid or expired coupon');
            if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestError('Coupon expired');

            if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
                throw new BadRequestError(`Min order amount is ${coupon.minOrderAmount}`);
            }

            discountAmount = coupon.discountType === 'percentage'
                ? (subtotal * Number(coupon.discountValue)) / 100
                : Number(coupon.discountValue);
            couponId = coupon.id;
        }

        const total = Math.max(0, subtotal - discountAmount);

        return db.transaction(async (tx) => {
            const [o] = await tx.insert(orders).values({
                userId,
                addressId,
                couponId,
                paymentMethod,
                subtotal: subtotal.toFixed(2),
                discountAmount: discountAmount.toFixed(2),
                total: total.toFixed(2),
            }).returning();

            await tx.insert(orderItems).values(
                cart.map((item) => ({
                    orderId: o!.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    totalPrice: (Number(item.price) * item.quantity).toFixed(2),
                }))
            );

            for (const item of cart) {
                await tx.update(products)
                    .set({ stock: sql`${products.stock} - ${item.quantity}` })
                    .where(eq(products.id, item.productId));
            }

            await tx.delete(cartItems).where(eq(cartItems.userId, userId));

            return o!;
        });
    }
}

export const orderService = new OrderService();

import { eq, and, sql, desc, count } from 'drizzle-orm';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { orders, orderItems } from '@/db/schema/order.js';
import { cartItems } from '@/db/schema/cart.js';
import { products } from '@/db/schema/product.js';
import { coupons } from '@/db/schema/coupon.js';
import { NotFoundError, BadRequestError } from '@/shared/errors.js';
import type { OrderPaginationQuery } from './schema.js';

export class OrderService {
    // ─── User Methods ────────────────────────────────────────────────────────

    async list(userId: string) {
        return db.query.orders.findMany({
            where: eq(orders.userId, userId),
            with: { items: { with: { product: true } }, address: true },
            orderBy: (o, { desc }) => [desc(o.createdAt)],
        });
    }

    async adminList(filters: { status?: string; userId?: string; page: number; limit: number }) {
        const { status, userId, page, limit } = filters;
        const offset = (page - 1) * limit;

        const conditions = [];
        if (status) conditions.push(eq(orders.status, status as any));
        if (userId) conditions.push(eq(orders.userId, userId));

        const [rows, totalResult] = await Promise.all([
            db.query.orders.findMany({
                where: conditions.length > 0 ? and(...conditions) : undefined,
                with: { user: { columns: { name: true, email: true } }, items: true },
                limit,
                offset,
                orderBy: [desc(orders.createdAt)],
            }),
            db.select({ value: count() }).from(orders).where(conditions.length > 0 ? and(...conditions) : undefined),
        ]);

        return {
            rows,
            total: Number(totalResult[0]?.value ?? 0),
        };
    }

    async getById(userId: string, orderId: string) {
        const order = await db.query.orders.findFirst({
            where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
            with: { items: { with: { product: true } }, address: true, coupon: true },
        });
        if (!order) throw new NotFoundError('Order');
        return order;
    }

    async adminGetById(orderId: string) {
        const order = await db.query.orders.findFirst({
            where: eq(orders.id, orderId),
            with: { user: true, items: { with: { product: true } }, address: true, coupon: true },
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
                paymentMethod: (paymentMethod === 'cod' ? 'cod' : 'on_air') as any,
                paymentType: 'full',
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

            if (couponId) {
                await tx.update(coupons)
                    .set({ usageCount: sql`${coupons.usageCount} + 1` })
                    .where(eq(coupons.id, couponId));
            }

            await tx.delete(cartItems).where(eq(cartItems.userId, userId));

            // Increment coupon usage if used
            if (couponId) {
                await tx.update(coupons)
                    .set({ usageCount: sql`${coupons.usageCount} + 1` })
                    .where(eq(coupons.id, couponId));
            }

            return o!;
        });
    }

    async updateStatus(id: string, data: { status: any; paymentStatus?: any }) {
        const [order] = await db
            .update(orders)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(orders.id, id))
            .returning();
        
        if (!order) throw new NotFoundError('Order');
        return order;
    }
}

export const orderService = new OrderService();

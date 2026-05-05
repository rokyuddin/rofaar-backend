import { eq, and, sql, desc, count } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { orders, orderItems } from '@/db/schema/order.js';
import { orderHistory } from '@/db/schema/order_history.js';
import { cartItems } from '@/db/schema/cart.js';
import { products } from '@/db/schema/product.js';
import { coupons } from '@/db/schema/coupon.js';
import { refunds } from '@/db/schema/refund.js';
import { shippingMethods } from '@/db/schema/shipping.js';
import { inventoryService } from '@/modules/inventory/service.js';
import { marketingService } from '@/modules/marketing/service.js';
import { NotFoundError, BadRequestError } from '@/shared/errors.js';
import type { CreateOrder, OrderParams, UpdateStatus, UpdatePaymentStatus, CancelOrder } from './schema.js';

export class OrderService {
    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async requireOrder(id: string) {
        const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
        if (!order) throw new NotFoundError('Order');
        return order;
    }

    private async logHistory(
        orderId: string,
        action: any,
        previousStatus: string | null,
        newStatus: string,
        performedBy: string | null = null,
        note?: string,
        metadata?: Record<string, any>
    ) {
        await db.insert(orderHistory).values({
            orderId,
            performedBy,
            action,
            previousStatus,
            newStatus,
            note,
            metadata: metadata ? JSON.stringify(metadata) : undefined,
        });
    }

    // ─── User Methods ─────────────────────────────────────────────────────────

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

    async getTracking(orderId: string) {
        const order = await db.query.orders.findFirst({
            where: eq(orders.id, orderId),
            with: {
                items: { with: { product: true } },
                address: true,
            },
        });
        if (!order) throw new NotFoundError('Order');

        const history = await db.query.orderHistory.findMany({
            where: eq(orderHistory.orderId, orderId),
            with: { performedBy: { columns: { name: true } } },
            orderBy: (h, { asc }) => [asc(h.createdAt)],
        });

        return { order, history };
    }

    // ─── Admin Methods ────────────────────────────────────────────────────────

    async adminList(filters: OrderParams) {
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

        return { rows, total: Number(totalResult[0]?.value ?? 0) };
    }

    async adminGetById(orderId: string) {
        const order = await db.query.orders.findFirst({
            where: eq(orders.id, orderId),
            with: { user: true, items: { with: { product: true } }, address: true, coupon: true },
        });
        if (!order) throw new NotFoundError('Order');
        return order;
    }

    // ─── Create Order ─────────────────────────────────────────────────────────
 
    async create(userId: string, data: CreateOrder) {
        const { addressId, paymentMethod, shippingMethodId, couponCode } = data;
 
        const cart = await db.query.cartItems.findMany({
            where: eq(cartItems.userId, userId),
            with: { product: true },
        });
 
        if (!cart.length) throw new BadRequestError('Cart is empty');

        const shippingMethod = await db.query.shippingMethods.findFirst({
            where: eq(shippingMethods.id, shippingMethodId),
        });
        if (!shippingMethod) throw new BadRequestError('Invalid shipping method');
 
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
 
        const shippingFee = Number(shippingMethod.cost);
        const total = Math.max(0, subtotal - discountAmount + shippingFee);
 
        return db.transaction(async (tx) => {
            const [o] = await tx.insert(orders).values({
                userId,
                addressId,
                couponId,
                paymentMethod: paymentMethod as any,
                paymentType: 'full',
                subtotal: subtotal.toFixed(2),
                discountAmount: discountAmount.toFixed(2),
                shippingMethodId,
                shippingFee: shippingFee.toFixed(2),
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
                await inventoryService.adjustStock({
                    productId: item.productId,
                    quantityChange: -item.quantity,
                    type: 'order_deduction',
                    note: `Order ${o!.id} placed`,
                    performedBy: userId,
                }, tx);
            }
 
            if (couponId) {
                await tx.update(coupons)
                    .set({ usageCount: sql`${coupons.usageCount} + 1` })
                    .where(eq(coupons.id, couponId));
            }
 
            await tx.delete(cartItems).where(eq(cartItems.userId, userId));
 
            await tx.insert(orderHistory).values({
                orderId: o!.id,
                performedBy: userId,
                action: 'placed',
                previousStatus: null,
                newStatus: 'pending',
                note: `Order placed via ${paymentMethod.toUpperCase()}. Shipping: ${shippingMethod.name}`,
            });
 
            return o!;
        });
    }

    // ─── Status Updates ───────────────────────────────────────────────────────

    async updateStatus(id: string, data: UpdateStatus, performedBy?: string | null) {
        const order = await this.requireOrder(id);
        const previousStatus = order.status;

        const [updated] = await db
            .update(orders)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(orders.id, id))
            .returning();

        if (!updated) throw new NotFoundError('Order');

        await this.logHistory(id, 'placed', previousStatus, data.status, performedBy ?? null);
        return updated;
    }

    async updatePaymentStatus(id: string, data: UpdatePaymentStatus, performedBy?: string | null) {
        const order = await this.requireOrder(id);
        const previousStatus = order.paymentStatus;

        const [updated] = await db
            .update(orders)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(orders.id, id))
            .returning();

        if (!updated) throw new NotFoundError('Order');

        await this.logHistory(
            id,
            data.paymentStatus === 'paid' ? 'payment_verified' : 'payment_pending',
            previousStatus,
            data.paymentStatus,
            performedBy ?? null
        );
        return updated;
    }

    async markAsPaid(id: string) {
        return this.updatePaymentStatus(id, { paymentStatus: 'paid' });
    }

    // ─── Lifecycle Actions ────────────────────────────────────────────────────

    async confirm(id: string, performedBy?: string | null) {
        const order = await this.requireOrder(id);
        if (order.status !== 'pending') {
            throw new BadRequestError(`Cannot confirm order with status '${order.status}'`);
        }
        const previousStatus = order.status;

        const [updated] = await db
            .update(orders)
            .set({ status: 'confirmed', updatedAt: new Date() })
            .where(eq(orders.id, id))
            .returning();

        if (!updated) throw new NotFoundError('Order');

        await this.logHistory(id, 'confirmed', previousStatus, 'confirmed', performedBy ?? null);
        return updated;
    }

    async process(id: string, performedBy?: string | null) {
        const order = await this.requireOrder(id);
        if (order.status !== 'confirmed') {
            throw new BadRequestError(`Cannot process order with status '${order.status}'`);
        }
        const previousStatus = order.status;

        const [updated] = await db
            .update(orders)
            .set({ status: 'processing', updatedAt: new Date() })
            .where(eq(orders.id, id))
            .returning();

        if (!updated) throw new NotFoundError('Order');

        await this.logHistory(id, 'processing', previousStatus, 'processing', performedBy ?? null);
        return updated;
    }

    async ship(id: string, data: { trackingNumber?: string; trackingUrl?: string }, performedBy?: string | null) {
        const order = await this.requireOrder(id);
        if (order.status !== 'processing') {
            throw new BadRequestError(`Cannot ship order with status '${order.status}'`);
        }
        if (order.paymentMethod === 'on_air' && order.paymentStatus !== 'paid') {
            throw new BadRequestError('Cannot ship unpaid on_air order');
        }
        const previousStatus = order.status;

        const [updated] = await db
            .update(orders)
            .set({ 
                status: 'shipped', 
                trackingNumber: data.trackingNumber,
                trackingUrl: data.trackingUrl,
                shippedAt: new Date(),
                updatedAt: new Date() 
            })
            .where(eq(orders.id, id))
            .returning();

        if (!updated) throw new NotFoundError('Order');

        await this.logHistory(id, 'shipped', previousStatus, 'shipped', performedBy ?? null, `Order shipped. Tracking: ${data.trackingNumber || 'N/A'}`);
        return updated;
    }

    async deliver(id: string, performedBy?: string | null) {
        const order = await this.requireOrder(id);
        if (order.status !== 'shipped') {
            throw new BadRequestError(`Cannot deliver order with status '${order.status}'`);
        }
        const previousStatus = order.status;

        const [updated] = await db
            .update(orders)
            .set({ status: 'delivered', deliveredAt: new Date(), updatedAt: new Date() })
            .where(eq(orders.id, id))
            .returning();

        if (!updated) throw new NotFoundError('Order');

        // Grant loyalty points
        await marketingService.grantLoyaltyPoints(updated.userId, Number(updated.total));

        await this.logHistory(id, 'delivered', previousStatus, 'delivered', performedBy ?? null);
        return updated;
    }

    async return(id: string, performedBy?: string | null) {
        const order = await this.requireOrder(id);
        if (order.status !== 'delivered') {
            throw new BadRequestError(`Cannot return order with status '${order.status}'`);
        }
        const previousStatus = order.status;

        const [updated] = await db
            .update(orders)
            .set({ status: 'returned', updatedAt: new Date() })
            .where(eq(orders.id, id))
            .returning();

        if (!updated) throw new NotFoundError('Order');

        await this.logHistory(id, 'returned', previousStatus, 'returned', performedBy ?? null);
        return updated;
    }

    async cancel(id: string, data?: CancelOrder, performedBy?: string | null) {
        const order = await this.requireOrder(id);

        const nonCancellable = ['cancelled', 'delivered', 'returned'];
        if (nonCancellable.includes(order.status)) {
            throw new BadRequestError(`Cannot cancel order with status '${order.status}'`);
        }

        return await db.transaction(async (tx) => {
            const [updated] = await tx
                .update(orders)
                .set({ status: 'cancelled', updatedAt: new Date() })
                .where(eq(orders.id, id))
                .returning();

            if (!updated) throw new NotFoundError('Order');

            const items = await tx.query.orderItems.findMany({
                where: eq(orderItems.orderId, id),
            });
            for (const item of items) {
                await inventoryService.adjustStock({
                    productId: item.productId,
                    quantityChange: item.quantity,
                    type: 'return_restock',
                    note: `Order ${id} cancelled`,
                    performedBy: performedBy ?? order.userId,
                }, tx);
            }

            if (order.paymentStatus === 'paid') {
                await tx.insert(refunds).values({
                    orderId: id,
                    userId: order.userId,
                    reason: data?.reason ?? 'Order cancelled',
                }).onConflictDoNothing();
            }

            await tx.insert(orderHistory).values({
                orderId: id,
                performedBy: performedBy ?? order.userId,
                action: 'cancelled',
                previousStatus: order.status,
                newStatus: 'cancelled',
                note: data?.reason ?? data?.comment ?? 'Order cancelled',
            });

            return updated;
        });
    }

    // ─── Cancel Request Handling ─────────────────────────────────────────────

    async approveCancelRequest(id: string, data: CancelOrder, performedBy?: string | null) {
        return this.cancel(id, data, performedBy ?? null);
    }

    async rejectCancelRequest(id: string, _data: CancelOrder) {
        return this.adminGetById(id);
    }

    // ─── Admin Deletion ───────────────────────────────────────────────────────

    async delete(id: string) {
        const [order] = await db.delete(orders).where(eq(orders.id, id)).returning();
        if (!order) throw new NotFoundError('Order');
        return order;
    }
}

export const orderService = new OrderService();

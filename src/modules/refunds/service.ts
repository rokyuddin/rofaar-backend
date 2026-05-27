import { db } from '@/config/db.js';
import { refunds } from '@/db/schema/refund.js';
import { orders } from '@/db/schema/order.js';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '@/shared/errors.js';

export class RefundService {
    async requestRefund(userId: string, data: { orderId: string; reason: string }) {
        const order = await db.query.orders.findFirst({
            where: and(eq(orders.id, data.orderId), eq(orders.userId, userId)),
        });

        if (!order) throw new NotFoundError('Order');
        if (order.status !== 'delivered') throw new BadRequestError('Only delivered orders can be refunded');

        // Check if refund already exists
        const existing = await db.query.refunds.findFirst({
            where: eq(refunds.orderId, data.orderId),
        });
        if (existing) throw new BadRequestError('Refund already requested for this order');

        const [refund] = await db.insert(refunds).values({
            orderId: data.orderId,
            userId,
            reason: data.reason,
            status: 'requested',
        }).returning();

        return refund;
    }

    async getByUserId(userId: string) {
        return db.query.refunds.findMany({
            where: eq(refunds.userId, userId),
            orderBy: (refunds, { desc }) => [desc(refunds.createdAt)],
        });
    }

    async adminList() {
        return db.query.refunds.findMany({
            with: { 
                order: true, 
                user: {
                    columns: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    }
                } 
            },
            orderBy: (refunds, { desc }) => [desc(refunds.createdAt)],
        });
    }

    async approveRefund(refundId: string, adminNote?: string | undefined) {
        const [refund] = await db.update(refunds)
            .set({ status: 'approved', adminNote, updatedAt: new Date() })
            .where(eq(refunds.id, refundId))
            .returning();
        
        if (!refund) throw new NotFoundError('Refund');

        // Update order status or payment status if needed
        await db.update(orders)
            .set({ status: 'returned', paymentStatus: 'refunded' })
            .where(eq(orders.id, refund.orderId));

        return refund;
    }

    async rejectRefund(refundId: string, adminNote: string) {
        const [refund] = await db.update(refunds)
            .set({ status: 'rejected', adminNote, updatedAt: new Date() })
            .where(eq(refunds.id, refundId))
            .returning();
        
        if (!refund) throw new NotFoundError('Refund');
        return refund;
    }
}

export const refundService = new RefundService();

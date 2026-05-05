import { eq, and } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { orders } from '@/db/schema/order.js';
import { payments } from '@/db/schema/payment.js';
import { NotFoundError, BadRequestError } from '@/shared/errors.js';
import type { OnAirPayment } from './schema.js';

export class PaymentService {
    // ─── Submit On Air Payment ────────────────────────────────────────────────
    /**
     * User submits their bKash/Nagad transaction ID and phone number.
     * Payment is recorded but status is 'pending' — admin will verify & mark as 'paid'.
     */
    async submitOnAirPayment(orderId: string, userId: string, data: OnAirPayment) {
        const order = await db.query.orders.findFirst({
            where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
        });

        if (!order) throw new NotFoundError('Order');

        if (order.paymentMethod !== 'on_air') {
            throw new BadRequestError('This order uses Cash on Delivery — no online payment needed');
        }

        if (order.paymentStatus === 'paid') {
            throw new BadRequestError('This order is already paid');
        }

        const allowedRetry = ['pending', 'confirmed'];
        if (!allowedRetry.includes(order.status)) {
            throw new BadRequestError(`Cannot submit payment for order with status '${order.status}'`);
        }

        // Create or update payment record
        const [payment] = await db.insert(payments).values({
            orderId,
            provider: 'on_air',
            amount: order.total,
            transactionId: data.transactionId,
            rawResponse: JSON.stringify({ phoneNumber: data.phoneNumber }),
            status: 'initiated',
        }).returning();

        return {
            paymentId: payment!.id,
            status: 'pending_verification',
            message: 'Payment submitted. Admin will verify and confirm.',
        };
    }

    // ─── Get Payment Records for an Order ─────────────────────────────────────

    async getByOrder(orderId: string, userId: string) {
        const order = await db.query.orders.findFirst({
            where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
        });
        if (!order) throw new NotFoundError('Order');

        return db.query.payments.findMany({
            where: eq(payments.orderId, orderId),
            orderBy: (p, { desc }) => [desc(p.createdAt)],
        });
    }
}

export const paymentService = new PaymentService();

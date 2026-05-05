import { z } from 'zod';
import { PaginationQuerySchema } from '@/shared/types.js';

export const CreateOrderSchema = z.object({
    addressId: z.string().uuid(),
    paymentMethod: z.enum(['cod', 'on_air']),
    shippingMethodId: z.string().uuid(),
    couponCode: z.string().optional(),
});

export const OrderParamsSchema = PaginationQuerySchema.extend({
    status: z.string().optional(),
    userId: z.string().uuid().optional(),
});

export const UpdateStatusSchema = z.object({
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']),
});

export const ShipOrderSchema = z.object({
    trackingNumber: z.string().optional(),
    trackingUrl: z.string().optional(),
});

export const UpdatePaymentStatusSchema = z.object({
    paymentStatus: z.enum(['unpaid', 'paid', 'partial', 'failed', 'refunded']),
});

export const CancelOrderSchema = z.object({
    reason: z.string().optional(),
    comment: z.string().optional(),
});

export const CancelRequestSchema = z.object({
    status: z.enum(['accepted', 'rejected']),
    comment: z.string().optional(),
});

export type CreateOrder = z.infer<typeof CreateOrderSchema>;
export type OrderParams = z.infer<typeof OrderParamsSchema>;
export type UpdateStatus = z.infer<typeof UpdateStatusSchema>;
export type UpdatePaymentStatus = z.infer<typeof UpdatePaymentStatusSchema>;
export type CancelOrder = z.infer<typeof CancelOrderSchema>;
export type CancelRequest = z.infer<typeof CancelRequestSchema>;

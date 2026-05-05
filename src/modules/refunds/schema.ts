import { z } from 'zod';

export const RequestRefundSchema = z.object({
    orderId: z.string().uuid(),
    reason: z.string().min(10),
});

export const ApproveRefundSchema = z.object({
    adminNote: z.string().optional(),
});

export const RejectRefundSchema = z.object({
    adminNote: z.string().min(5),
});

export const RefundResponseSchema = z.object({
    id: z.string().uuid(),
    orderId: z.string().uuid(),
    userId: z.string().uuid(),
    status: z.string(),
    reason: z.string(),
    adminNote: z.string().nullable(),
    createdAt: z.date(),
});

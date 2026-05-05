import { z } from 'zod';

// ─── Online Payment Schema ────────────────────────────────────────────────────
export const OnAirPaymentSchema = z.object({
    transactionId: z.string().min(1, 'Transaction ID is required'),
    phoneNumber: z.string().min(10, 'Valid phone number required').max(15),
});

// ─── Webhook Schemas (kept for future gateway integration) ──────────────────
export const WebhookPayloadSchema = z.object({
    tran_id: z.string(),
    val_id: z.string().optional(),
    status: z.string(),
    amount: z.string().optional(),
    currency: z.string().optional(),
}).passthrough();

export type OnAirPayment = z.infer<typeof OnAirPaymentSchema>;
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

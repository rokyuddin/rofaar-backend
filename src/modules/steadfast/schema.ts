import { z } from 'zod';

// ─── Create Order Request / Response ─────────────────────────────────────────

export const CreateOrderRequestSchema = z.object({
    invoice: z.string().min(1, { message: 'Invoice is required' }),
    recipient_name: z.string().min(1).max(100),
    recipient_phone: z.string().length(11, { message: 'Phone must be 11 digits' }),
    alternative_phone: z.string().length(11).optional(),
    recipient_email: z.string().email().optional(),
    recipient_address: z.string().min(1).max(250),
    cod_amount: z.number().min(0),
    note: z.string().optional(),
    item_description: z.string().optional(),
    total_lot: z.number().optional(),
    delivery_type: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const BulkCreateOrderItemSchema = z.object({
    invoice: z.string().min(1),
    recipient_name: z.string().min(1).max(100),
    recipient_address: z.string().min(1).max(250),
    recipient_phone: z.string().length(11),
    cod_amount: z.number().min(0),
    note: z.string().optional(),
});

export const BulkCreateOrderRequestSchema = z.object({
    data: z.array(BulkCreateOrderItemSchema).min(1).max(500),
});

// ─── Status Response ─────────────────────────────────────────────────────────

export const SteadfastStatusSchema = z.enum([
    'pending',
    'in_review',
    'hold',
    'delivered_approval_pending',
    'partial_delivered_approval_pending',
    'cancelled_approval_pending',
    'delivered',
    'partial_delivered',
    'cancelled',
    'unknown',
]);

// ─── Create Return Request ───────────────────────────────────────────────────

export const CreateReturnRequestSchema = z.object({
    consignment_id: z.number().optional(),
    invoice: z.string().optional(),
    tracking_code: z.string().optional(),
    reason: z.string().optional(),
});

// ─── Webhook Payloads ────────────────────────────────────────────────────────

export const DeliveryStatusWebhookSchema = z.object({
    notification_type: z.literal('delivery_status'),
    consignment_id: z.number(),
    invoice: z.string(),
    cod_amount: z.number(),
    status: z.string(),
    delivery_charge: z.number(),
    tracking_message: z.string(),
    updated_at: z.string(),
});

export const TrackingUpdateWebhookSchema = z.object({
    notification_type: z.literal('tracking_update'),
    consignment_id: z.number(),
    invoice: z.string(),
    tracking_message: z.string(),
    updated_at: z.string(),
});

export const SteadfastWebhookSchema = z.discriminatedUnion('notification_type', [
    DeliveryStatusWebhookSchema,
    TrackingUpdateWebhookSchema,
]);

// ─── API Response Wrapper ────────────────────────────────────────────────────

export const SteadfastApiResponseSchema = z.object({
    status: z.number(),
    message: z.string().optional(),
});

export const CreateOrderResponseSchema = SteadfastApiResponseSchema.extend({
    consignment: z.object({
        consignment_id: z.number(),
        invoice: z.string(),
        tracking_code: z.string(),
        recipient_name: z.string(),
        recipient_phone: z.string(),
        recipient_address: z.string(),
        cod_amount: z.number(),
        status: z.string(),
        note: z.string().nullable(),
        created_at: z.string(),
        updated_at: z.string(),
    }).optional(),
});

export const StatusResponseSchema = SteadfastApiResponseSchema.extend({
    delivery_status: z.string().optional(),
});

export const BalanceResponseSchema = SteadfastApiResponseSchema.extend({
    current_balance: z.number().optional(),
});

export const BulkCreateResponseItemSchema = z.object({
    invoice: z.string(),
    recipient_name: z.string(),
    recipient_address: z.string(),
    recipient_phone: z.string(),
    cod_amount: z.string(),
    note: z.string().nullable(),
    consignment_id: z.number().nullable(),
    tracking_code: z.string().nullable(),
    status: z.string(),
});

export const CreateReturnResponseSchema = SteadfastApiResponseSchema.extend({
    id: z.number().optional(),
    user_id: z.number().optional(),
    consignment_id: z.number().optional(),
    reason: z.string().nullable().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export type BulkCreateOrderItem = z.infer<typeof BulkCreateOrderItemSchema>;
export type BulkCreateOrderRequest = z.infer<typeof BulkCreateOrderRequestSchema>;
export type SteadfastStatus = z.infer<typeof SteadfastStatusSchema>;
export type CreateReturnRequest = z.infer<typeof CreateReturnRequestSchema>;
export type SteadfastWebhook = z.infer<typeof SteadfastWebhookSchema>;
export type DeliveryStatusWebhook = z.infer<typeof DeliveryStatusWebhookSchema>;
export type TrackingUpdateWebhook = z.infer<typeof TrackingUpdateWebhookSchema>;
export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;
export type StatusResponse = z.infer<typeof StatusResponseSchema>;
export type BalanceResponse = z.infer<typeof BalanceResponseSchema>;
export type BulkCreateResponseItem = z.infer<typeof BulkCreateResponseItemSchema>;
export type CreateReturnResponse = z.infer<typeof CreateReturnResponseSchema>;

import { z } from 'zod';
import { PaginationQuerySchema } from '@/shared/types.js';

export const CreateOrderSchema = z.object({
    addressId: z.string().uuid(),
    paymentMethod: z.enum(['cod', 'sslcommerz', 'bkash']),
    couponCode: z.string().optional(),
});

export const UpdateOrderStatusSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']).optional(),
    paymentStatus: z.enum(['unpaid', 'paid', 'partial', 'failed', 'refunded']).optional(),
});

export const OrderPaginationSchema = PaginationQuerySchema.extend({
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']).optional(),
});

export type CreateOrderBody = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusBody = z.infer<typeof UpdateOrderStatusSchema>;
export type OrderPaginationQuery = z.infer<typeof OrderPaginationSchema>;

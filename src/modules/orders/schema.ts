import { z } from 'zod';
import { PaginationQuerySchema } from '@/shared/types.js';
import { PaginationQuerySchema } from '@/shared/types.js';

export const CreateOrderSchema = z.object({
    addressId: z.string().uuid(),
    paymentMethod: z.enum(['cod', 'sslcommerz', 'bkash']),
    couponCode: z.string().optional(),
});

export const OrderParamsSchema = PaginationQuerySchema.extend({
    status: z.string().optional(),
    userId: z.string().uuid().optional(),
});

export const UpdateOrderStatusSchema = z.object({
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']),
    paymentStatus: z.enum(['unpaid', 'paid', 'failed', 'refunded']).optional(),
});

import { z } from 'zod';

export const CreateOrderSchema = z.object({
    addressId: z.string().uuid(),
    paymentMethod: z.enum(['cod', 'sslcommerz', 'bkash']),
    couponCode: z.string().optional(),
});

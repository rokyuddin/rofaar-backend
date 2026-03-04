import { z } from 'zod';

export const CreateCouponSchema = z.object({
    code: z.string().min(1).max(50),
    description: z.string().optional(),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.coerce.number().positive(),
    minOrderAmount: z.coerce.number().nonnegative().default(0),
    maxUsageCount: z.coerce.number().int().positive().optional(),
    isActive: z.boolean().default(true),
    expiresAt: z.string().datetime().optional(),
});

export const UpdateCouponSchema = CreateCouponSchema.partial().extend({
    id: z.string().uuid(),
});

export const ValidateCouponSchema = z.object({
    code: z.string().min(1),
    amount: z.coerce.number().positive(),
});

export const DeleteCouponSchema = z.object({
    id: z.string().uuid(),
});

export type CreateCouponBody = z.infer<typeof CreateCouponSchema>;
export type UpdateCouponBody = z.infer<typeof UpdateCouponSchema>;
export type DeleteCouponBody = z.infer<typeof DeleteCouponSchema>;
export type ValidateCouponQuery = z.infer<typeof ValidateCouponSchema>;

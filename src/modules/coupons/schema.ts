import { z } from 'zod';

export const CouponSchema = z.object({
    id: z.string().uuid(),
    code: z.string(),
    description: z.string().nullable(),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.string(),
    minOrderAmount: z.string(),
    maxUsageCount: z.number().nullable(),
    usageCount: z.number(),
    isActive: z.boolean(),
    expiresAt: z.date().nullable(),
});

export const CreateCouponSchema = z.object({
    code: z.string().min(1).toUpperCase(),
    description: z.string().optional(),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.coerce.number().positive(),
    minOrderAmount: z.coerce.number().nonnegative().default(0),
    maxUsageCount: z.number().int().positive().optional(),
    isActive: z.boolean().default(true),
    expiresAt: z.string().datetime().optional(),
});

export const UpdateCouponSchema = CreateCouponSchema.partial();

export type CreateCoupon = z.infer<typeof CreateCouponSchema>;
export type UpdateCoupon = z.infer<typeof UpdateCouponSchema>;

export const ValidateCouponSchema = z.object({
    code: z.string().min(1).toUpperCase(),
    orderAmount: z.coerce.number().positive(),
});

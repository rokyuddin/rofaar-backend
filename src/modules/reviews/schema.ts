import { z } from 'zod';

export const ReviewSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    productId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().nullable(),
    createdAt: z.date(),
});

export const CreateReviewSchema = z.object({
    productId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
});

export const UpdateReviewSchema = z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().optional(),
});

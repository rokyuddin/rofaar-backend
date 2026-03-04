import { z } from 'zod';
import { PaginationQuerySchema } from '@/shared/types.js';

export const CreateReviewSchema = z.object({
    productId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
});

export const ReviewPaginationSchema = PaginationQuerySchema.extend({
    productId: z.string().uuid().optional(),
    rating: z.number().int().min(1).max(5).optional(),
});

export const DeleteReviewSchema = z.object({
    id: z.string().uuid(),
});

export type CreateReviewBody = z.infer<typeof CreateReviewSchema>;
export type ReviewPaginationQuery = z.infer<typeof ReviewPaginationSchema>;
export type DeleteReviewBody = z.infer<typeof DeleteReviewSchema>;

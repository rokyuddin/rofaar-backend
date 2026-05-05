import { z } from 'zod';
import { UuidSchema } from '@/shared/types.js';

// ─── Categories ──────────────────────────────────────────────────────────

export const CategorySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    imageUrl: z.string().nullable(),
    createdAt: z.date(),
});

export const CreateCategorySchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();
export type CreateCategory = z.infer<typeof CreateCategorySchema>;
export type UpdateCategory = z.infer<typeof UpdateCategorySchema>;

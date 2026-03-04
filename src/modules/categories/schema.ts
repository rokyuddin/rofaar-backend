import { z } from 'zod';
import { UuidSchema } from '@/shared/types.js';

// ─── Categories ──────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
});

export const UpdateCategorySchema = CreateCategorySchema.extend({
    id: UuidSchema,
}).partial({
    name: true,
});

export const DeleteCategorySchema = z.object({
    id: UuidSchema,
});

// ─── Tags ────────────────────────────────────────────────────────────────

export const CreateTagSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).optional(),
});

export const UpdateTagSchema = CreateTagSchema.extend({
    id: UuidSchema,
}).partial({
    name: true,
});

export const DeleteTagSchema = z.object({
    id: UuidSchema,
});

export type CreateCategoryBody = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof UpdateCategorySchema>;
export type DeleteCategoryBody = z.infer<typeof DeleteCategorySchema>;

export type CreateTagBody = z.infer<typeof CreateTagSchema>;
export type UpdateTagBody = z.infer<typeof UpdateTagSchema>;
export type DeleteTagBody = z.infer<typeof DeleteTagSchema>;

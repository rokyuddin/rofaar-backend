import { z } from 'zod';

// ─── Common reusable Zod schemas ─────────────────────────────────────────────

export const UuidSchema = z.string().uuid();

export const PaginationQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export const IdParamSchema = z.object({
    id: UuidSchema,
});

export const SlugParamSchema = z.object({
    slug: z.string().min(1),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

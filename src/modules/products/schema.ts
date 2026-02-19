import { z } from 'zod';
import { PaginationQuerySchema, SlugParamSchema, IdParamSchema } from '@/shared/types.js';

export const ProductSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    price: z.string(),
    stock: z.number(),
    isActive: z.boolean(),
    category: z.object({ id: z.string(), name: z.string() }).nullable(),
    images: z.array(z.object({ url: z.string(), sortOrder: z.number() })),
});

export const ProductParamsSchema = PaginationQuerySchema.extend({
    category: z.string().optional(),
    tag: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    search: z.string().optional(),
});

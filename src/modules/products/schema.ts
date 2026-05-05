import { z } from 'zod';
import { PaginationQuerySchema } from '@/shared/types.js';

export const ProductSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    price: z.string(),
    stock: z.number(),
    isActive: z.boolean(),
    category: z.object({ id: z.string(), name: z.string() }).nullable(),
    brand: z.object({ id: z.string(), name: z.string() }).nullable(),
    images: z.array(z.object({ url: z.string(), sortOrder: z.number() })),
});

export const ProductParamsSchema = PaginationQuerySchema.extend({
    category: z.string().optional(),
    brand: z.string().optional(),
    tag: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    search: z.string().optional(),
    sort: z.enum(['newest', 'price-low', 'price-high', 'popular']).optional(),
});

export const CreateProductSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    price: z.coerce.number().positive(),
    stock: z.coerce.number().int().nonnegative().default(0),
    isActive: z.boolean().default(true),
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    images: z.array(z.object({
        url: z.string().url(),
        sortOrder: z.number().int().default(0)
    })).optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
export type ProductParams = z.infer<typeof ProductParamsSchema>;

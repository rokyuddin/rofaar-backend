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

export const ProductParamsSchema = z.object({
    page: z.coerce.number().int().positive().default(1).describe('Page number for pagination'),
    limit: z.coerce.number().int().positive().max(100).default(10).describe('Number of items per page'),
    search: z.string().optional().describe('Search term for product name'),
    category: z.string().uuid().optional().describe('Filter by category UUID'),
    brand: z.string().uuid().optional().describe('Filter by brand UUID'),
    minPrice: z.coerce.number().nonnegative().optional().describe('Minimum price filter'),
    maxPrice: z.coerce.number().nonnegative().optional().describe('Maximum price filter'),
    sort: z.enum(['newest', 'price-low', 'price-high', 'popular']).default('newest').describe('Sorting criteria'),
});

export const AdminProductParamsSchema = ProductParamsSchema.extend({
    isActive: z.enum(['true', 'false']).optional().transform(v => v === undefined ? undefined : v === 'true'),
});

export const CreateProductSchema = z.object({
    name: z.string().min(1).describe('Name of the product'),
    slug: z.string().min(1).describe('Unique URL-friendly slug'),
    description: z.string().min(1).describe('Detailed product description'),
    price: z.number().positive().describe('Product price in decimal'),
    stock: z.number().int().nonnegative().describe('Current inventory count'),
    isActive: z.boolean().default(true).describe('Whether the product is visible to customers'),
    categoryId: z.string().uuid().describe('UUID of the category'),
    brandId: z.string().uuid().describe('UUID of the brand'),
    images: z.array(z.object({
        url: z.string().url().describe('Image URL'),
        sortOrder: z.number().int().default(0).describe('Order in which the image appears')
    })).min(1).describe('List of product images')
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const SlugParamSchema = z.object({
    slug: z.string().min(1).describe('URL-friendly product slug'),
});

export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
export type ProductParams = z.infer<typeof ProductParamsSchema>;
export type AdminProductParams = z.infer<typeof AdminProductParamsSchema>;

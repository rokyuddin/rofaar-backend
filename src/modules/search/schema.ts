import { z } from 'zod';

export const productSearchSchema = z.object({
    q: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    sortBy: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).default('newest'),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
});

export type ProductSearchInput = z.infer<typeof productSearchSchema>;

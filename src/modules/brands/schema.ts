import { z } from 'zod';

export const BrandSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    logoUrl: z.string().nullable(),
    createdAt: z.date(),
});

export const CreateBrandSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    logoUrl: z.string().optional(),
});

export const UpdateBrandSchema = CreateBrandSchema.partial();

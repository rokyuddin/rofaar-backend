import { z } from 'zod';

export const CategorySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    parentId: z.string().uuid().nullable(),
});

export const TagSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
});

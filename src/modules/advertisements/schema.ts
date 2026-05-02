import { z } from 'zod';

export const AdvertisementSchema = z.object({
    id: z.string().uuid(),
    title: z.string().nullable(),
    imageUrl: z.string(),
    linkUrl: z.string().nullable(),
    position: z.string(),
    isActive: z.boolean(),
});

export const CreateAdvertisementSchema = z.object({
    title: z.string().optional(),
    imageUrl: z.string().url(),
    linkUrl: z.string().url().optional(),
    position: z.string().min(1),
    isActive: z.boolean().default(true),
});

export const UpdateAdvertisementSchema = CreateAdvertisementSchema.partial();

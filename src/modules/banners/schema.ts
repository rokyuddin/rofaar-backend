import { z } from 'zod';

export const BannerSchema = z.object({
    id: z.string().uuid(),
    title: z.string().nullable(),
    subtitle: z.string().nullable(),
    imageUrl: z.string(),
    linkUrl: z.string().nullable(),
    isActive: z.boolean(),
    sortOrder: z.number(),
});

export const CreateBannerSchema = z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    imageUrl: z.string().url(),
    linkUrl: z.string().url().optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
});

export const UpdateBannerSchema = CreateBannerSchema.partial();

export type CreateBanner = z.infer<typeof CreateBannerSchema>;
export type UpdateBanner = z.infer<typeof UpdateBannerSchema>;

export interface FileUpload {
  filename: string;
  mimetype: string;
  data: Buffer;
}

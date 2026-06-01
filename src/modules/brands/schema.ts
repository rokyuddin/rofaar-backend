import { z } from 'zod';
import { PaginationQuerySchema } from "@/shared/types.js";

export const BrandSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    logoUrl: z.string().nullable(),
    createdAt: z.date(),
});

export const BrandParamsSchema = PaginationQuerySchema.extend({
  search: z.string().optional().describe("Search term for brand name"),
});

export const AdminBrandParamsSchema = BrandParamsSchema.extend({
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const CreateBrandSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    logoUrl: z.string().optional(),
});

export const UpdateBrandSchema = CreateBrandSchema.partial();
export type CreateBrand = z.infer<typeof CreateBrandSchema>;
export type UpdateBrand = z.infer<typeof UpdateBrandSchema>;
export type BrandParams = z.infer<typeof BrandParamsSchema>;
export type AdminBrandParams = z.infer<typeof AdminBrandParamsSchema>;

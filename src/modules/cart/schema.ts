import { z } from "zod";

export const AddCartItemSchema = z.object({
    variantId: z.string().uuid("variantId is required"),
    quantity: z.number().int().positive("quantity must be a positive integer"),
});

export const UpdateCartItemSchema = z.object({
    quantity: z.number().int().positive("quantity must be a positive integer"),
});

export const SyncCartSchema = z.object({
    items: z
        .array(
            z.object({
                variantId: z.string().uuid("variantId must be a valid UUID"),
                quantity: z.number().int().positive("quantity must be a positive integer"),
            }),
        )
        .min(1, "At least one item is required")
        .max(100, "Cannot sync more than 100 items at once"),
});

export type AddCartItem = z.infer<typeof AddCartItemSchema>;
export type UpdateCartItem = z.infer<typeof UpdateCartItemSchema>;
export type SyncCart = z.infer<typeof SyncCartSchema>;

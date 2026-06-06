import { z } from "zod";

export const AddCartItemSchema = z.object({
    variantId: z.string().uuid("variantId is required"),
    quantity: z.number().int().positive("quantity must be a positive integer"),
});

export const UpdateCartItemSchema = z.object({
    quantity: z.number().int().positive("quantity must be a positive integer"),
});

export type AddCartItem = z.infer<typeof AddCartItemSchema>;
export type UpdateCartItem = z.infer<typeof UpdateCartItemSchema>;

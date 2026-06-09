import { z } from 'zod';

export const AddWishlistItemSchema = z.object({
    productId: z.string().uuid(),
});

export const SyncWishlistSchema = z.object({
    items: z
        .array(
            z.object({
                productId: z.string().uuid("productId must be a valid UUID"),
            }),
        )
        .min(1, "At least one item is required")
        .max(100, "Cannot sync more than 100 items at once"),
});

export type SyncWishlist = z.infer<typeof SyncWishlistSchema>;

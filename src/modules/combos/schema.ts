import { z } from 'zod';

export const CreateComboSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().min(0),
    items: z.array(z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1),
    })),
});

export const ComboResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    price: z.string(),
    isActive: z.boolean(),
    items: z.array(z.any()).optional(),
});

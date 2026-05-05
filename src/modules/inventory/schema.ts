import { z } from 'zod';

export const AdjustStockSchema = z.object({
    productId: z.string().uuid(),
    quantityChange: z.number().int(),
    type: z.enum(['stock_increase', 'stock_decrease', 'manual_adjustment']),
    note: z.string().optional(),
});

export const InventoryLogResponseSchema = z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    type: z.string(),
    quantityChange: z.number(),
    stockAfter: z.number(),
    note: z.string().nullable(),
    createdAt: z.date(),
});

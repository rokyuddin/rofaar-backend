import { z } from "zod";
import { PaginationQuerySchema } from "@/shared/types.js";

export const WarehouseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string(),
    address: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const CreateWarehouseSchema = z.object({
    name: z.string().min(1).max(255),
    code: z
        .string()
        .min(1)
        .max(50)
        .regex(/^[A-Z0-9-]+$/, "code must be uppercase alphanumeric with dashes"),
    address: z.string().max(1000).optional(),
    isActive: z.coerce.boolean().default(true),
});

export const UpdateWarehouseSchema = CreateWarehouseSchema.partial();

export const WarehouseParamsSchema = PaginationQuerySchema.extend({
    isActive: z
        .enum(["true", "false"])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === "true")),
    search: z.string().optional(),
});

export const WarehouseIdParamSchema = z.object({
    id: z.string().uuid("id must be a valid UUID"),
});

// ─── Inventory ───────────────────────────────────────────────────────────────

export const InventoryRowSchema = z.object({
    id: z.string().uuid(),
    variantId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    quantity: z.number().int(),
    lowStockThreshold: z.number().int(),
    createdAt: z.date(),
    updatedAt: z.date(),
    variant: z
        .object({
            id: z.string().uuid(),
            sku: z.string(),
            name: z.string(),
            product: z.object({
                id: z.string().uuid(),
                name: z.string(),
                slug: z.string(),
            }),
        })
        .optional(),
    warehouse: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
            code: z.string(),
        })
        .optional(),
});

export const SetInventorySchema = z.object({
    quantity: z.coerce.number().int().nonnegative(),
    lowStockThreshold: z.coerce.number().int().nonnegative().default(5),
});

export const InventoryIdParamSchema = z.object({
    variantId: z.string().uuid(),
    warehouseId: z.string().uuid(),
});

export const AdjustInventorySchema = z.object({
    variantId: z.string().uuid(),
    warehouseId: z.string().uuid().optional(),
    quantityChange: z.coerce.number().int().refine((n) => n !== 0, {
        message: "quantityChange cannot be zero",
    }),
    type: z.enum([
        "stock_increase",
        "stock_decrease",
        "manual_adjustment",
        "return_restock",
        "order_deduction",
    ]),
    note: z.string().optional(),
    reason: z.string().optional(),
    performedBy: z.string().uuid().optional(),
});

export const LowStockQuerySchema = z.object({
    warehouseId: z.string().uuid().optional(),
    limit: z.coerce.number().int().positive().max(200).default(50),
});

export type Warehouse = z.infer<typeof WarehouseSchema>;
export type CreateWarehouse = z.infer<typeof CreateWarehouseSchema>;
export type UpdateWarehouse = z.infer<typeof UpdateWarehouseSchema>;
export type WarehouseParams = z.infer<typeof WarehouseParamsSchema>;
export type InventoryRow = z.infer<typeof InventoryRowSchema>;
export type SetInventory = z.infer<typeof SetInventorySchema>;
export type AdjustInventory = z.infer<typeof AdjustInventorySchema>;
export type LowStockQuery = z.infer<typeof LowStockQuerySchema>;

import { eq, sql, desc, and, sql as raw } from "drizzle-orm";
import { db } from "@/config/db.js";
import { inventoryLogs } from "@/db/schema/inventory.js";
import { products } from "@/db/schema/product.js";
import { productInventory } from "@/db/schema/warehouse.js";
import { productVariants } from "@/db/schema/productVariant.js";
import { NotFoundError } from "@/shared/errors.js";

type InventoryLogType =
    | "stock_increase"
    | "stock_decrease"
    | "order_deduction"
    | "manual_adjustment"
    | "return_restock";

interface LogAdjustmentInput {
    productId: string;
    variantId?: string | null;
    warehouseId?: string | null;
    quantityChange: number;
    type: InventoryLogType;
    note?: string | undefined;
    stockAfter?: number | undefined;
    performedBy?: string | undefined;
}

export class InventoryService {
    // ─── Legacy product-level stock adjustment ─────────────────────────────
    // Kept for backward compatibility. New code should use warehouseService
    // for variant-level adjustments and call logAdjustment separately.

    async adjustStock(
        data: {
            productId: string;
            quantityChange: number;
            type: InventoryLogType;
            note?: string;
            performedBy?: string;
        },
        tx?: any,
    ) {
        const database = tx || db;

        const product = await database.query.products.findFirst({
            where: eq(products.id, data.productId),
        });
        if (!product) throw new NotFoundError("Product");

        const newStock = product.stock + data.quantityChange;

        await database
            .update(products)
            .set({ stock: newStock, updatedAt: new Date() })
            .where(eq(products.id, data.productId));

        const [log] = await database
            .insert(inventoryLogs)
            .values({
                productId: data.productId,
                type: data.type,
                quantityChange: data.quantityChange,
                stockAfter: newStock,
                note: data.note,
                performedBy: data.performedBy,
            })
            .returning();

        return log;
    }

    // ─── Logs ──────────────────────────────────────────────────────────────

    async getLogs(productId?: string) {
        return db.query.inventoryLogs.findMany({
            where: productId ? eq(inventoryLogs.productId, productId) : undefined,
            orderBy: (l, { desc }) => [desc(l.createdAt)],
            with: {
                product: { columns: { name: true } },
                variant: { columns: { sku: true, name: true } },
                warehouse: { columns: { code: true, name: true } },
            },
        });
    }

    async getLowStockProducts() {
        return db.query.products.findMany({
            where: sql`${products.stock} <= ${products.lowStockThreshold}`,
            with: { category: true, brand: true },
        });
    }

    /**
     * Insert a row in inventory_logs. Use this after manually adjusting
     * variant-level stock via warehouseService.adjustInventory. If
     * `stockAfter` is not provided, it's looked up from the
     * (variantId, warehouseId) inventory row in the same transaction.
     */
    async logAdjustment(data: LogAdjustmentInput, tx?: any) {
        const database = tx || db;
        let stockAfter = data.stockAfter;
        if (stockAfter === undefined && data.variantId && data.warehouseId) {
            const row = await database.query.productInventory.findFirst({
                where: and(
                    eq(productInventory.variantId, data.variantId),
                    eq(productInventory.warehouseId, data.warehouseId),
                ),
            });
            stockAfter = row?.quantity ?? 0;
        }
        if (stockAfter === undefined) {
            stockAfter = 0;
        }
        const [log] = await database
            .insert(inventoryLogs)
            .values({
                productId: data.productId,
                variantId: data.variantId ?? null,
                warehouseId: data.warehouseId ?? null,
                type: data.type,
                quantityChange: data.quantityChange,
                stockAfter,
                note: data.note,
                performedBy: data.performedBy ?? null,
            })
            .returning();
        return log!;
    }

    // ─── Stock queries ────────────────────────────────────────────────────

    /**
     * Get the total available stock for a variant across all warehouses.
     */
    async getAvailableStock(variantId: string): Promise<number> {
        const rows = await db
            .select({ qty: productInventory.quantity })
            .from(productInventory)
            .where(eq(productInventory.variantId, variantId));
        return rows.reduce((sum, r) => sum + r.qty, 0);
    }

    /**
     * Sum of all stock across all variants for a product (denormalized
     * mirror of the product.stock field). Used to keep product.stock in
     * sync when has_variants=true.
     */
    async getProductTotalStock(productId: string): Promise<number> {
        const rows = await db
            .select({ qty: productInventory.quantity })
            .from(productInventory)
            .innerJoin(productVariants, eq(productVariants.id, productInventory.variantId))
            .where(eq(productVariants.productId, productId));
        return rows.reduce((sum, r) => sum + r.qty, 0);
    }
}

export const inventoryService = new InventoryService();

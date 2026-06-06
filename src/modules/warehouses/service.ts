import { eq, ilike, and, count, desc, asc, sql, lte } from "drizzle-orm";
import { db } from "@/config/db.js";
import { warehouses, productInventory } from "@/db/schema/warehouse.js";
import { productVariants } from "@/db/schema/productVariant.js";
import { products } from "@/db/schema/product.js";
import { NotFoundError, BadRequestError, ConflictError } from "@/shared/errors.js";
import type {
    CreateWarehouse,
    UpdateWarehouse,
    WarehouseParams,
    SetInventory,
    AdjustInventory,
} from "./schema.js";

export class WarehouseService {
    // ─── Warehouses CRUD ────────────────────────────────────────────────────

    async list(params: WarehouseParams) {
        const { page, limit, search, isActive } = params;
        const offset = (page - 1) * limit;

        const conditions = [];
        if (isActive !== undefined) conditions.push(eq(warehouses.isActive, isActive));
        if (search) conditions.push(ilike(warehouses.name, `%${search}%`));

        const [rows, totalResult] = await Promise.all([
            db.query.warehouses.findMany({
                where: conditions.length > 0 ? and(...conditions) : undefined,
                limit,
                offset,
                orderBy: [asc(warehouses.name)],
            }),
            db
                .select({ value: count() })
                .from(warehouses)
                .where(conditions.length > 0 ? and(...conditions) : undefined),
        ]);

        return {
            rows,
            total: Number(totalResult[0]?.value ?? 0),
        };
    }

    async getById(id: string) {
        const row = await db.query.warehouses.findFirst({
            where: eq(warehouses.id, id),
        });
        if (!row) throw new NotFoundError("Warehouse");
        return row;
    }

    async create(data: CreateWarehouse) {
        const existing = await db.query.warehouses.findFirst({
            where: eq(warehouses.code, data.code),
        });
        if (existing) {
            throw new ConflictError(`Warehouse with code "${data.code}" already exists`);
        }
        const [row] = await db.insert(warehouses).values(data).returning();
        if (!row) throw new Error("Warehouse creation failed");
        return row;
    }

    async update(id: string, data: UpdateWarehouse) {
        if (data.code) {
            const existing = await db.query.warehouses.findFirst({
                where: and(eq(warehouses.code, data.code)),
            });
            if (existing && existing.id !== id) {
                throw new ConflictError(`Warehouse with code "${data.code}" already exists`);
            }
        }
        const [row] = await db
            .update(warehouses)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(warehouses.id, id))
            .returning();
        if (!row) throw new NotFoundError("Warehouse");
        return row;
    }

    async delete(id: string) {
        // Check no inventory is stored here
        const stock = await db
            .select({ value: count() })
            .from(productInventory)
            .where(eq(productInventory.warehouseId, id));
        const total = Number(stock[0]?.value ?? 0);
        if (total > 0) {
            throw new BadRequestError(
                `Cannot delete warehouse with ${total} inventory record(s). Transfer stock first.`,
            );
        }
        const [row] = await db.delete(warehouses).where(eq(warehouses.id, id)).returning();
        if (!row) throw new NotFoundError("Warehouse");
        return row;
    }

    // ─── Inventory (variant × warehouse) ────────────────────────────────────

    /**
     * Set the absolute stock level for a variant in a warehouse. If a row
     * exists it's updated, otherwise a new one is inserted.
     */
    async setInventory(variantId: string, warehouseId: string, data: SetInventory) {
        await this.assertVariant(variantId);
        await this.getById(warehouseId);

        const existing = await db.query.productInventory.findFirst({
            where: and(
                eq(productInventory.variantId, variantId),
                eq(productInventory.warehouseId, warehouseId),
            ),
        });

        if (existing) {
            const [row] = await db
                .update(productInventory)
                .set({
                    quantity: data.quantity,
                    lowStockThreshold: data.lowStockThreshold,
                    updatedAt: new Date(),
                })
                .where(eq(productInventory.id, existing.id))
                .returning();
            return row!;
        }

        const [row] = await db
            .insert(productInventory)
            .values({
                variantId,
                warehouseId,
                quantity: data.quantity,
                lowStockThreshold: data.lowStockThreshold,
            })
            .returning();
        return row!;
    }

    async getInventoryByVariant(variantId: string) {
        return db.query.productInventory.findMany({
            where: eq(productInventory.variantId, variantId),
            with: { warehouse: true },
            orderBy: [asc(productInventory.warehouseId)],
        });
    }

    async listInventory(opts: { warehouseId?: string; variantId?: string; limit?: number; offset?: number } = {}) {
        const { warehouseId, variantId, limit = 100, offset = 0 } = opts;
        const conditions = [];
        if (warehouseId) conditions.push(eq(productInventory.warehouseId, warehouseId));
        if (variantId) conditions.push(eq(productInventory.variantId, variantId));

        const [rows, totalResult] = await Promise.all([
            db.query.productInventory.findMany({
                where: conditions.length > 0 ? and(...conditions) : undefined,
                with: {
                    warehouse: true,
                    variant: { with: { product: { columns: { id: true, name: true, slug: true } } } },
                },
                limit,
                offset,
                orderBy: [desc(productInventory.updatedAt)],
            }),
            db
                .select({ value: count() })
                .from(productInventory)
                .where(conditions.length > 0 ? and(...conditions) : undefined),
        ]);
        return { rows, total: Number(totalResult[0]?.value ?? 0) };
    }

    async getLowStock(opts: { warehouseId?: string; limit?: number } = {}) {
        const { warehouseId, limit = 50 } = opts;
        const conditions = [sql`${productInventory.quantity} <= ${productInventory.lowStockThreshold}`];
        if (warehouseId) conditions.push(eq(productInventory.warehouseId, warehouseId));

        return db.query.productInventory.findMany({
            where: and(...conditions),
            with: {
                warehouse: true,
                variant: { with: { product: { columns: { id: true, name: true, slug: true } } } },
            },
            limit,
            orderBy: [asc(productInventory.quantity)],
        });
    }

    /**
     * Pick the warehouse to deduct from for a given variant. Strategy:
     * 1. Find the warehouse with the most stock for this variant that has
     *    enough stock to cover the requested quantity.
     * 2. Fall back to the first active warehouse.
     */
    async pickWarehouseForDeduction(variantId: string, quantity: number): Promise<string> {
        // First try: warehouse with enough stock, most stock first
        const candidates = await db
            .select({ id: productInventory.warehouseId, qty: productInventory.quantity })
            .from(productInventory)
            .where(
                and(
                    eq(productInventory.variantId, variantId),
                    sql`${productInventory.quantity} >= ${quantity}`,
                ),
            )
            .orderBy(desc(productInventory.quantity))
            .limit(1);

        const first = candidates[0];
        if (first) return first.id;

        // Fallback: any active warehouse (deficit will trigger insufficient stock at order time)
        const any = await db
            .select({ id: warehouses.id })
            .from(warehouses)
            .where(eq(warehouses.isActive, true))
            .orderBy(asc(warehouses.createdAt))
            .limit(1);

        const anyFirst = any[0];
        if (!anyFirst) {
            throw new BadRequestError("No active warehouse configured");
        }
        return anyFirst.id;
    }

    /**
     * Apply a quantity change to a variant's stock in a specific warehouse.
     * Returns the updated inventory row and the new stock for that warehouse.
     */
    async adjustInventory(
        data: AdjustInventory,
        tx?: any,
    ) {
        const database = tx || db;
        const warehouseId = data.warehouseId ?? (await this.pickWarehouseForDeduction(data.variantId, 0));

        // Find or create the inventory row
        let row = await database.query.productInventory.findFirst({
            where: and(
                eq(productInventory.variantId, data.variantId),
                eq(productInventory.warehouseId, warehouseId),
            ),
        });

        if (!row) {
            [row] = await database
                .insert(productInventory)
                .values({
                    variantId: data.variantId,
                    warehouseId,
                    quantity: 0,
                    lowStockThreshold: 5,
                })
                .returning();
        }

        const newQty = row!.quantity + data.quantityChange;
        if (newQty < 0) {
            throw new BadRequestError(
                `Insufficient stock in warehouse ${warehouseId}. Have ${row!.quantity}, change ${data.quantityChange}`,
            );
        }

        const [updated] = await database
            .update(productInventory)
            .set({ quantity: newQty, updatedAt: new Date() })
            .where(eq(productInventory.id, row!.id))
            .returning();

        return { row: updated!, warehouseId };
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private async assertVariant(variantId: string) {
        const v = await db.query.productVariants.findFirst({
            where: eq(productVariants.id, variantId),
        });
        if (!v) throw new NotFoundError("Variant");
    }
}

export const warehouseService = new WarehouseService();

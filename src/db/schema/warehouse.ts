import {
    pgTable,
    uuid,
    varchar,
    text,
    integer,
    timestamp,
    boolean,
    uniqueIndex,
    index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { productVariants } from './productVariant';

// ─── Warehouses ──────────────────────────────────────────────────────────────

export const warehouses = pgTable(
    'warehouses',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        name: varchar('name', { length: 255 }).notNull(),
        code: varchar('code', { length: 50 }).notNull(),
        address: text('address'),
        isActive: boolean('is_active').notNull().default(true),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => {
        return {
            codeIdx: uniqueIndex('warehouses_code_unique').on(t.code),
        };
    },
);

// ─── Product Inventory (per-variant, per-warehouse stock) ─────────────────────

export const productInventory = pgTable(
    'product_inventory',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        variantId: uuid('variant_id')
            .notNull()
            .references(() => productVariants.id, { onDelete: 'cascade' }),
        warehouseId: uuid('warehouse_id')
            .notNull()
            .references(() => warehouses.id, { onDelete: 'cascade' }),
        quantity: integer('quantity').notNull().default(0),
        lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => {
        return {
            uniqVariantWarehouse: uniqueIndex('uq_product_inventory_variant_warehouse').on(
                t.variantId,
                t.warehouseId,
            ),
            variantIdx: index('product_inventory_variant_id_idx').on(t.variantId),
            warehouseIdx: index('product_inventory_warehouse_id_idx').on(t.warehouseId),
        };
    },
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const warehousesRelations = relations(warehouses, ({ many }) => ({
    inventory: many(productInventory),
}));

export const productInventoryRelations = relations(productInventory, ({ one }) => ({
    variant: one(productVariants, {
        fields: [productInventory.variantId],
        references: [productVariants.id],
    }),
    warehouse: one(warehouses, {
        fields: [productInventory.warehouseId],
        references: [warehouses.id],
    }),
}));

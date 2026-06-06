import { pgTable, uuid, integer, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user';
import { products } from './product';
import { productVariants } from './productVariant';
import { warehouses } from './warehouse';

export const inventoryLogTypeEnum = pgEnum('inventory_log_type', [
    'stock_increase',
    'stock_decrease',
    'order_deduction',
    'manual_adjustment',
    'return_restock',
]);

export const inventoryLogs = pgTable('inventory_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    warehouseId: uuid('warehouse_id').references(() =>warehouses.id, { onDelete: 'set null' }),
    type: inventoryLogTypeEnum('type').notNull(),
    quantityChange: integer('quantity_change').notNull(), // positive = increase, negative = decrease
    stockAfter: integer('stock_after').notNull(),
    note: text('note'),
    performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryLogsRelations = relations(inventoryLogs, ({ one }) => ({
    product: one(products, { fields: [inventoryLogs.productId], references: [products.id] }),
    variant: one(productVariants, { fields: [inventoryLogs.variantId], references: [productVariants.id] }),
    warehouse: one(warehouses, { fields: [inventoryLogs.warehouseId], references: [warehouses.id] }),
    performer: one(users, { fields: [inventoryLogs.performedBy], references: [users.id] }),
}));

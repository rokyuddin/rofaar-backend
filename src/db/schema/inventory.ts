import { pgTable, uuid, integer, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user.js';
import { products } from './product.js';

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
    type: inventoryLogTypeEnum('type').notNull(),
    quantityChange: integer('quantity_change').notNull(), // positive = increase, negative = decrease
    stockAfter: integer('stock_after').notNull(),
    note: text('note'),
    performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryLogsRelations = relations(inventoryLogs, ({ one }) => ({
    product: one(products, { fields: [inventoryLogs.productId], references: [products.id] }),
    performer: one(users, { fields: [inventoryLogs.performedBy], references: [users.id] }),
}));

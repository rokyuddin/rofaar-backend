import { pgTable, uuid, varchar, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './order.js';
import { users } from './user.js';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const orderHistoryActionEnum = pgEnum('order_history_action', [
    'placed',           // Order created
    'confirmed',        // Admin confirmed
    'processing',      // Started processing
    'shipped',          // Order shipped
    'delivered',       // Order delivered
    'cancelled',       // Cancelled
    'returned',        // Returned
    'payment_pending', // On Air payment submitted
    'payment_verified', // Admin verified payment
    'cancel_requested', // Customer requested cancellation
]);

// ─── Order History Table ───────────────────────────────────────────────────────

export const orderHistory = pgTable('order_history', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
        .notNull()
        .references(() => orders.id, { onDelete: 'cascade' }),
    performedBy: uuid('performed_by').references(() => users.id), // null for system actions
    action: orderHistoryActionEnum('action').notNull(),
    previousStatus: varchar('previous_status', { length: 50 }),
    newStatus: varchar('new_status', { length: 50 }).notNull(),
    note: text('note'),
    metadata: text('metadata'), // JSON string for extra data (e.g., transaction ID, phone)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const orderHistoryRelations = relations(orderHistory, ({ one }) => ({
    order: one(orders, { fields: [orderHistory.orderId], references: [orders.id] }),
    performedBy: one(users, { fields: [orderHistory.performedBy], references: [users.id] }),
}));
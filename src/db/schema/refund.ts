import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user.js';
import { orders } from './order.js';

export const refundStatusEnum = pgEnum('refund_status', [
    'requested',
    'approved',
    'rejected',
    'refunded',
]);

export const refunds = pgTable('refunds', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
        .notNull()
        .unique() // one refund per order
        .references(() => orders.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id),
    status: refundStatusEnum('status').notNull().default('requested'),
    reason: text('reason').notNull(),
    adminNote: text('admin_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const refundsRelations = relations(refunds, ({ one }) => ({
    order: one(orders, { fields: [refunds.orderId], references: [orders.id] }),
    user: one(users, { fields: [refunds.userId], references: [users.id] }),
}));

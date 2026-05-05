import { pgTable, uuid, varchar, numeric, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './order.js';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const paymentTxStatusEnum = pgEnum('payment_tx_status', [
    'initiated',
    'success',
    'failed',
]);

// ─── Payments Table ───────────────────────────────────────────────────────────

export const payments = pgTable('payments', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
        .notNull()
        .references(() => orders.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(), // 'sslcommerz' | 'bkash' | 'manual'
    transactionId: varchar('transaction_id', { length: 255 }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    status: paymentTxStatusEnum('status').notNull().default('initiated'),
    rawResponse: text('raw_response'), // store full gateway JSON for audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const paymentsRelations = relations(payments, ({ one }) => ({
    order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

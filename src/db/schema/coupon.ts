import { pgTable, uuid, varchar, text, boolean, numeric, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './order.js';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed']);

// ─── Table ───────────────────────────────────────────────────────────────────

export const coupons = pgTable('coupons', {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    description: text('description'),
    discountType: discountTypeEnum('discount_type').notNull(),
    discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
    minOrderAmount: numeric('min_order_amount', { precision: 10, scale: 2 }).default('0'),
    maxUsageCount: integer('max_usage_count'), // null = unlimited
    usageCount: integer('usage_count').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const couponsRelations = relations(coupons, ({ many }) => ({
    orders: many(orders),
}));

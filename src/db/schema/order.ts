import {
    pgTable,
    uuid,
    numeric,
    varchar,
    integer,
    timestamp,
    pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user.js';
import { addresses } from './address.js';
import { products } from './product.js';
import { coupons } from './coupon.js';
import { refunds } from './refund.js';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum('order_status', [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
    'unpaid',
    'paid',
    'partial',
    'failed',
    'refunded',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
    'cod',
    "on_air"
]);

export const paymentTypeEnum = pgEnum('payment_type', [
    'full',
    'partial',
]);

// ─── Orders Table ─────────────────────────────────────────────────────────────

export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id),
    addressId: uuid('address_id')
        .notNull()
        .references(() => addresses.id),
    couponId: uuid('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
    status: orderStatusEnum('status').notNull().default('pending'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('unpaid'),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    paymentType: paymentTypeEnum('payment_type').notNull(),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
    paymentTransactionId: varchar('payment_transaction_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Order Items Table ────────────────────────────────────────────────────────

export const orderItems = pgTable('order_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
        .notNull()
        .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(), // price snapshot
    totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const ordersRelations = relations(orders, ({ one, many }) => ({
    user: one(users, { fields: [orders.userId], references: [users.id] }),
    address: one(addresses, { fields: [orders.addressId], references: [addresses.id] }),
    coupon: one(coupons, { fields: [orders.couponId], references: [coupons.id] }),
    items: many(orderItems),
    refund: one(refunds),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
    product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

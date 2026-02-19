import {
    pgTable,
    uuid,
    integer,
    numeric,
    timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user.js';
import { products } from './product.js';

// ─── Table ───────────────────────────────────────────────────────────────────

export const cartItems = pgTable('cart_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(), // snapshot at time of add
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
    user: one(users, { fields: [cartItems.userId], references: [users.id] }),
    product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

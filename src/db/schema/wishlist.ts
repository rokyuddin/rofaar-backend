import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user.js';
import { products } from './product.js';

export const wishlistItems = pgTable('wishlist_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
    user: one(users, { fields: [wishlistItems.userId], references: [users.id] }),
    product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));

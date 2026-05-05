import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user.js';
import { products } from './product.js';

export const productViews = pgTable('product_views', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productViewsRelations = relations(productViews, ({ one }) => ({
    user: one(users, { fields: [productViews.userId], references: [users.id] }),
    product: one(products, { fields: [productViews.productId], references: [products.id] }),
}));

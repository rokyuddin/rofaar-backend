import { pgTable, uuid, integer, text, timestamp, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './user.js';
import { products } from './product.js';

export const reviews = pgTable(
    'reviews',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        rating: integer('rating').notNull(),
        comment: text('comment'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        check('rating_range', sql`${t.rating} BETWEEN 1 AND 5`),
    ],
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
    user: one(users, { fields: [reviews.userId], references: [users.id] }),
    product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));

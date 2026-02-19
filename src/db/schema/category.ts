import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './product.js';

// ─── Table ───────────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ many }) => ({
    products: many(products),
}));

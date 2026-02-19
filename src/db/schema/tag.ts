import { pgTable, uuid, varchar, primaryKey, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './product.js';

// ─── Table ───────────────────────────────────────────────────────────────────

export const tags = pgTable('tags', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Join Table ───────────────────────────────────────────────────────────────

export const productTags = pgTable(
    'product_tags',
    {
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        tagId: uuid('tag_id')
            .notNull()
            .references(() => tags.id, { onDelete: 'cascade' }),
    },
    (t) => [primaryKey({ columns: [t.productId, t.tagId] })],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const tagsRelations = relations(tags, ({ many }) => ({
    products: many(productTags),
}));

export const productTagsRelations = relations(productTags, ({ one }) => ({
    product: one(products, { fields: [productTags.productId], references: [products.id] }),
    tag: one(tags, { fields: [productTags.tagId], references: [tags.id] }),
}));

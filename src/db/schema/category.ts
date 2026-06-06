import { pgTable, uuid, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './product';

// ─── Table ───────────────────────────────────────────────────────────────────

export const categories = pgTable(
    'categories',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        name: varchar('name', { length: 100 }).notNull().unique(),
        slug: varchar('slug', { length: 100 }).notNull().unique(),
        description: text('description'),
        imageUrl: text('image_url'),
        parentId: uuid('parent_id').references((): any => categories.id, { onDelete: 'set null' }),
        path: varchar('path', { length: 500 }),
        isActive: boolean('is_active').notNull().default(true),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => {
        return {
            parentIdx: index('categories_parent_id_idx').on(t.parentId),
        };
    },
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ one, many }) => ({
    parent: one(categories, {
        fields: [categories.parentId],
        references: [categories.id],
        relationName: 'category_parent',
    }),
    children: many(categories, { relationName: 'category_parent' }),
    products: many(products),
}));

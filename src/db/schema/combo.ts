import { pgTable, uuid, varchar, text, numeric, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './product.js';

export const combos = pgTable('combos', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const comboItems = pgTable('combo_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    comboId: uuid('combo_id')
        .notNull()
        .references(() => combos.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(1),
});

export const combosRelations = relations(combos, ({ many }) => ({
    items: many(comboItems),
}));

export const comboItemsRelations = relations(comboItems, ({ one }) => ({
    combo: one(combos, { fields: [comboItems.comboId], references: [combos.id] }),
    product: one(products, { fields: [comboItems.productId], references: [products.id] }),
}));

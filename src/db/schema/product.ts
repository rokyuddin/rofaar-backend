import {
    pgTable,
    uuid,
    text,
    varchar,
    integer,
    numeric,
    timestamp,
    boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { categories } from './category.js';
import { productTags } from './tag.js';
import { reviews } from './review.js';
import { inventoryLogs } from './inventory.js';

// ─── Table ───────────────────────────────────────────────────────────────────

export const products = pgTable('products', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    stock: integer('stock').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Product Images ───────────────────────────────────────────────────────────

export const productImages = pgTable('product_images', {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const productsRelations = relations(products, ({ one, many }) => ({
    category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
    images: many(productImages),
    tags: many(productTags),
    reviews: many(reviews),
    inventoryLogs: many(inventoryLogs),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
    product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

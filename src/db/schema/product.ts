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
import { categories } from './category';
import { productTags } from './tag';
import { reviews } from './review';
import { inventoryLogs } from './inventory';
import { brands } from './brand';
import {
    productVariants,
    productSpecs,
    productAttributes,
} from './productVariant';

// ─── Table ───────────────────────────────────────────────────────────────────

export const products = pgTable('products', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    costPrice: numeric('cost_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
    discountPercentage: integer('discount_percentage').notNull().default(0),
    stock: integer('stock').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(10),
    isActive: boolean('is_active').notNull().default(true),
    status: varchar('status', { length: 20 }).notNull().default('published'), // 'draft' | 'published' | 'archived'
    hasVariants: boolean('has_variants').notNull().default(false),
    freeShipping: boolean('free_shipping').notNull().default(false),
    // Physical dimensions (all optional)
    weight: numeric('weight', { precision: 8, scale: 3 }),
    length: numeric('length', { precision: 8, scale: 2 }),
    width: numeric('width', { precision: 8, scale: 2 }),
    height: numeric('height', { precision: 8, scale: 2 }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'set null' }),
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
    brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
    images: many(productImages),
    variants: many(productVariants),
    specs: many(productSpecs),
    attributes: many(productAttributes),
    tags: many(productTags),
    reviews: many(reviews),
    inventoryLogs: many(inventoryLogs),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
    product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

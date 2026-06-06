import {
    pgTable,
    uuid,
    varchar,
    text,
    integer,
    numeric,
    timestamp,
    boolean,
    jsonb,
    uniqueIndex,
    index,
    primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './product';

// ─── Product Variants ─────────────────────────────────────────────────────────

export const productVariants = pgTable(
    'product_variants',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        sku: varchar('sku', { length: 100 }).notNull().unique(),
        name: varchar('name', { length: 255 }).notNull(),
        basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
        salePrice: numeric('sale_price', { precision: 10, scale: 2 }),
        stock: integer('stock').notNull().default(0),
        isDefault: boolean('is_default').notNull().default(false),
        isActive: boolean('is_active').notNull().default(true),
        isLocked: boolean('is_locked').notNull().default(false),
        sortOrder: integer('sort_order').notNull().default(0),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => {
        return {
            productIdx: index('product_variants_product_id_idx').on(t.productId),
            // Enforce: only one default variant per product
            uniqueDefault: uniqueIndex('uq_product_variants_default_per_product')
                .on(t.productId)
                .where(sql`is_default = true`),
        };
    },
);

// ─── Product Specs (product-level specifications like Material, Warranty) ─────

export const productSpecs = pgTable(
    'product_specs',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        name: varchar('name', { length: 100 }).notNull(),
        value: varchar('value', { length: 255 }).notNull(),
        sortOrder: integer('sort_order').notNull().default(0),
    },
    (t) => {
        return {
            uniqProductSpec: uniqueIndex('uq_product_specs_product_name').on(t.productId, t.name),
            productIdx: index('product_specs_product_id_idx').on(t.productId),
        };
    },
);

// ─── Product Attributes (variant options like Color, Size) ───────────────────

export const productAttributes = pgTable(
    'product_attributes',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        name: varchar('name', { length: 100 }).notNull(),
        slug: varchar('slug', { length: 100 }).notNull(),
        sortOrder: integer('sort_order').notNull().default(0),
    },
    (t) => {
        return {
            uniqProductSlug: uniqueIndex('uq_product_attributes_product_slug').on(t.productId, t.slug),
            productIdx: index('product_attributes_product_id_idx').on(t.productId),
        };
    },
);

// ─── Product Attribute Values (e.g. Red, Blue, Large) ─────────────────────────

export const productAttributeValues = pgTable(
    'product_attribute_values',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        attributeId: uuid('attribute_id')
            .notNull()
            .references(() => productAttributes.id, { onDelete: 'cascade' }),
        value: varchar('value', { length: 100 }).notNull(),
        slug: varchar('slug', { length: 100 }).notNull(),
        metadata: jsonb('metadata'),
        sortOrder: integer('sort_order').notNull().default(0),
    },
    (t) => {
        return {
            uniqAttrSlug: uniqueIndex('uq_product_attribute_values_attr_slug').on(t.attributeId, t.slug),
            attrIdx: index('product_attribute_values_attribute_id_idx').on(t.attributeId),
        };
    },
);

// ─── Product Variant Attributes (join: variant ↔ attribute values) ────────────

export const productVariantAttributes = pgTable(
    'product_variant_attributes',
    {
        variantId: uuid('variant_id')
            .notNull()
            .references(() => productVariants.id, { onDelete: 'cascade' }),
        attributeValueId: uuid('attribute_value_id')
            .notNull()
            .references(() => productAttributeValues.id, { onDelete: 'cascade' }),
    },
    (t) => {
        return {
            pk: primaryKey({ columns: [t.variantId, t.attributeValueId] }),
            attrValueIdx: index('product_variant_attributes_attribute_value_id_idx').on(t.attributeValueId),
        };
    },
);

// ─── Relations ───────────────────────────────────────────────────────────────

import { sql } from 'drizzle-orm';

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
    product: one(products, { fields: [productVariants.productId], references: [products.id] }),
    variantAttributes: many(productVariantAttributes),
}));

export const productSpecsRelations = relations(productSpecs, ({ one }) => ({
    product: one(products, { fields: [productSpecs.productId], references: [products.id] }),
}));

export const productAttributesRelations = relations(productAttributes, ({ one, many }) => ({
    product: one(products, { fields: [productAttributes.productId], references: [products.id] }),
    values: many(productAttributeValues),
}));

export const productAttributeValuesRelations = relations(productAttributeValues, ({ one, many }) => ({
    attribute: one(productAttributes, {
        fields: [productAttributeValues.attributeId],
        references: [productAttributes.id],
    }),
    variantAttributes: many(productVariantAttributes),
}));

export const productVariantAttributesRelations = relations(productVariantAttributes, ({ one }) => ({
    variant: one(productVariants, {
        fields: [productVariantAttributes.variantId],
        references: [productVariants.id],
    }),
    attributeValue: one(productAttributeValues, {
        fields: [productVariantAttributes.attributeValueId],
        references: [productAttributeValues.id],
    }),
}));

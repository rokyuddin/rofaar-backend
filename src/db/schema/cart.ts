import {
    pgTable,
    uuid,
    integer,
    numeric,
    timestamp,
    index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user';
import { products } from './product';
import { productVariants } from './productVariant';

// ─── Table ───────────────────────────────────────────────────────────────────

export const cartItems = pgTable(
    'cart_items',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        variantId: uuid('variant_id')
            .notNull()
            .references(() => productVariants.id, { onDelete: 'cascade' }),
        quantity: integer('quantity').notNull().default(1),
        price: numeric('price', { precision: 10, scale: 2 }).notNull(), // snapshot at time of add
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => {
        return {
            userVariantIdx: index('cart_items_user_variant_idx').on(t.userId, t.variantId),
        };
    },
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
    user: one(users, { fields: [cartItems.userId], references: [users.id] }),
    product: one(products, { fields: [cartItems.productId], references: [products.id] }),
    variant: one(productVariants, {
        fields: [cartItems.variantId],
        references: [productVariants.id],
    }),
}));

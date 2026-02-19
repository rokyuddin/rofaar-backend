import {
    pgTable,
    uuid,
    text,
    varchar,
    timestamp,
    pgEnum,
    boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ['admin', 'customer']);

// ─── Table ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').notNull().default('customer'),
    isVerified: boolean('is_verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations (resolved at runtime via db/index.ts barrel) ──────────────────
// Circular deps are safe here because Drizzle relations() is evaluated lazily.

export const usersRelations = relations(users, ({ many }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { addresses } = require('./address.js') as typeof import('./address.js');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { orders } = require('./order.js') as typeof import('./order.js');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cartItems } = require('./cart.js') as typeof import('./cart.js');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { wishlistItems } = require('./wishlist.js') as typeof import('./wishlist.js');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { reviews } = require('./review.js') as typeof import('./review.js');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { refunds } = require('./refund.js') as typeof import('./refund.js');

    return {
        addresses: many(addresses),
        orders: many(orders),
        cartItems: many(cartItems),
        wishlistItems: many(wishlistItems),
        reviews: many(reviews),
        refunds: many(refunds),
    };
});

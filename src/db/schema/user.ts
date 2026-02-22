import {
    pgTable,
    uuid,
    text,
    varchar,
    timestamp,
    pgEnum,
    boolean,
    index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ['customer', 'operator', 'super_admin']);
export const statusEnum = pgEnum('status', ['active', 'suspended', 'blocked', 'pending_verification', 'deleted']);

// ─── Table ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull().unique(),
    email: varchar('email', { length: 150 }),
    passwordHash: text('password_hash'),
    role: roleEnum('role').notNull().default('customer'),
    status: statusEnum('status').notNull().default('active'),
    isPhoneVerified: boolean('is_phone_verified').notNull().default(false),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => {
    return {
        phoneIdx: index('users_phone_idx').on(t.phone),
        emailIdx: index('users_email_idx').on(t.email),
    }
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

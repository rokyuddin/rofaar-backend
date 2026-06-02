import {
    pgTable,
    uuid,
    text,
    varchar,
    timestamp,
    boolean,
    integer,
    index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Table ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }), // nullable until registration complete
    email: varchar('email', { length: 255 }).unique(), // nullable until registration complete
    phone: varchar('phone', { length: 20 }).notNull().unique(),
    avatar: varchar('avatar', { length: 500 }),
    passwordHash: text('password_hash'), // nullable until registration complete

    roleId: uuid('role_id').notNull(), // FK → roles.id (references added via relations)
    isVerified: boolean('is_verified').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    registrationStep: varchar('registration_step', { length: 20 }).notNull().default('pending_otp'), // pending_otp, pending_profile, completed
    loyaltyPoints: integer('loyalty_points').notNull().default(0),
    pendingPhone: varchar('pending_phone', { length: 20 }), // Store phone before verification
    resetToken: varchar('reset_token', { length: 255 }),
    resetTokenExpires: timestamp('reset_token_expires', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => {
    return {
        phoneIdx: index('users_phone_idx').on(t.phone),
        emailIdx: index('users_email_idx').on(t.email),
    }
});

// ─── Relations ────────────────────────────────────────────────────────────────
// Resolved at runtime to avoid circular import issues.

export const usersRelations = relations(users, ({ one, many }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { roles } = require('./rbac') as typeof import('./rbac');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { addresses } = require('./address') as typeof import('./address');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { orders } = require('./order') as typeof import('./order');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cartItems } = require('./cart') as typeof import('./cart');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { wishlistItems } = require('./wishlist') as typeof import('./wishlist');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { reviews } = require('./review') as typeof import('./review');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { refunds } = require('./refund') as typeof import('./refund');

    return {
        role: one(roles, {
            fields: [users.roleId],
            references: [roles.id],
        }),
        addresses: many(addresses),
        orders: many(orders),
        cartItems: many(cartItems),
        wishlistItems: many(wishlistItems),
        reviews: many(reviews),
        refunds: many(refunds),
    };
});

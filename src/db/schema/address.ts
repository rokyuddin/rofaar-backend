import {
    pgTable,
    uuid,
    varchar,
    boolean,
    timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user.js';
import { orders } from './order.js';

// ─── Table ───────────────────────────────────────────────────────────────────

export const addresses = pgTable('addresses', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 50 }).notNull().default('Home'), // Home, Office...
    recipientName: varchar('recipient_name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    addressLine: varchar('address_line', { length: 500 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    district: varchar('district', { length: 100 }).notNull(),
    postalCode: varchar('postal_code', { length: 10 }),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const addressesRelations = relations(addresses, ({ one, many }) => ({
    user: one(users, { fields: [addresses.userId], references: [users.id] }),
    orders: many(orders),
}));

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
    altPhone: varchar('alt_phone', { length: 20 }),
    address: varchar('address', { length: 500 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    area: varchar('area', { length: 100 }).notNull(), // upozila
    zone: varchar('zone', { length: 100 }), // union
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const addressesRelations = relations(addresses, ({ one, many }) => ({
    user: one(users, { fields: [addresses.userId], references: [users.id] }),
    orders: many(orders),
}));

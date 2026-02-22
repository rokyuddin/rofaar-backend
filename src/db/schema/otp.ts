import { pgTable, uuid, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const otps = pgTable('otps', {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: varchar('phone', { length: 20 }).notNull(),
    code: varchar('code', { length: 4 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isUsed: boolean('is_used').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    index('otps_phone_idx').on(t.phone),
]);

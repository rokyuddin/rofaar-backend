import { pgTable, uuid, varchar, timestamp, boolean, index, pgEnum, integer } from 'drizzle-orm/pg-core';

export const otpTypeEnum = pgEnum('otp_type', [
    'registration',
    'password_reset',
]);

export const otps = pgTable('otps', {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: varchar('phone', { length: 20 }).notNull(),
    code: varchar('code', { length: 6 }).notNull(),
    type: otpTypeEnum('type').notNull().default('registration'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isUsed: boolean('is_used').notNull().default(false),
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    index('otps_phone_idx').on(t.phone),
]);

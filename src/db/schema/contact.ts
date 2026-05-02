import { pgTable, uuid, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const contactSubmissions = pgTable('contact_submissions', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    subject: varchar('subject', { length: 255 }),
    message: text('message').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, read, resolved
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

export const logs = pgTable('logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    level: text('level').notNull(), // info, warn, error
    message: text('message').notNull(),
    context: jsonb('context'), // Metadata like userId, path, ip
    timestamp: timestamp('timestamp').defaultNow().notNull(),
});

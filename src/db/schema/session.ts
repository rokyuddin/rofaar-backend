import {
    pgTable,
    uuid,
    varchar,
    timestamp,
    index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user';

export const refreshTokens = pgTable('refresh_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => {
    return {
        userIdIdx: index('refresh_tokens_user_id_idx').on(t.userId),
        tokenIdx: index('refresh_tokens_token_idx').on(t.token),
    };
});

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
    user: one(users, {
        fields: [refreshTokens.userId],
        references: [users.id],
    }),
}));

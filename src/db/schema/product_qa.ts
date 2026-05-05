import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user.js';
import { products } from './product.js';

export const productQuestions = pgTable('product_questions', {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    isPublic: boolean('is_public').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productAnswers = pgTable('product_answers', {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id').notNull().references(() => productQuestions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    answer: text('answer').notNull(),
    isOfficial: boolean('is_official').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productQuestionsRelations = relations(productQuestions, ({ one, many }) => ({
    product: one(products, { fields: [productQuestions.productId], references: [products.id] }),
    user: one(users, { fields: [productQuestions.userId], references: [users.id] }),
    answers: many(productAnswers),
}));

export const productAnswersRelations = relations(productAnswers, ({ one }) => ({
    question: one(productQuestions, { fields: [productAnswers.questionId], references: [productQuestions.id] }),
    user: one(users, { fields: [productAnswers.userId], references: [users.id] }),
}));

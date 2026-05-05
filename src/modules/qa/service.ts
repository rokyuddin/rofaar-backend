import { db } from '@/config/db.js';
import { productQuestions, productAnswers } from '@/db/schema/product_qa.js';
import { eq, and } from 'drizzle-orm';
import { NotFoundError } from '@/shared/errors.js';

export class QAService {
    async askQuestion(userId: string, data: { productId: string; question: string }) {
        const [question] = await db.insert(productQuestions).values({
            ...data,
            userId,
        }).returning();
        return question;
    }

    async answerQuestion(userId: string, data: { questionId: string; answer: string; isOfficial?: boolean }) {
        const question = await db.query.productQuestions.findFirst({
            where: eq(productQuestions.id, data.questionId),
        });
        if (!question) throw new NotFoundError('Question');

        const [answer] = await db.insert(productAnswers).values({
            ...data,
            userId,
        }).returning();
        return answer;
    }

    async listByProduct(productId: string) {
        return db.query.productQuestions.findMany({
            where: and(eq(productQuestions.productId, productId), eq(productQuestions.isPublic, true)),
            with: {
                user: { columns: { name: true } },
                answers: {
                    with: { user: { columns: { name: true } } },
                },
            },
            orderBy: (q, { desc }) => [desc(q.createdAt)],
        });
    }

    async deleteQuestion(id: string, userId?: string) {
        const conditions = [eq(productQuestions.id, id)];
        if (userId) conditions.push(eq(productQuestions.userId, userId));

        const [deleted] = await db.delete(productQuestions).where(and(...conditions)).returning();
        if (!deleted) throw new NotFoundError('Question');
        return deleted;
    }
}

export const qaService = new QAService();

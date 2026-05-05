import { z } from 'zod';

export const CreateQuestionSchema = z.object({
    productId: z.string().uuid(),
    question: z.string().min(5),
});

export const CreateAnswerSchema = z.object({
    questionId: z.string().uuid(),
    answer: z.string().min(2),
});

export const QAResponseSchema = z.object({
    id: z.string().uuid(),
    question: z.string(),
    createdAt: z.date(),
    user: z.object({ name: z.string() }),
    answers: z.array(z.object({
        id: z.string().uuid(),
        answer: z.string(),
        isOfficial: z.boolean(),
        createdAt: z.date(),
        user: z.object({ name: z.string() }),
    })),
});

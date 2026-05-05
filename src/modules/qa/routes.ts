import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { qaService } from './service.js';
import { CreateQuestionSchema, CreateAnswerSchema, QAResponseSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { z } from 'zod';

const qaRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Public Routes ────────────────────────────────────────────────────────
    f.get('/products/:id/questions', {
        schema: {
            params: z.object({ id: z.string().uuid() }),
            response: { 200: z.object({ success: z.literal(true), data: z.array(QAResponseSchema) }) },
        },
        handler: async (request) => {
            const questions = await qaService.listByProduct(request.params.id);
            return success(questions);
        },
    });

    // ─── Protected Routes ─────────────────────────────────────────────────────
    f.register(async (app) => {
        app.addHook('onRequest', fastify.authenticate);

        app.post('/questions', {
            schema: {
                body: CreateQuestionSchema,
                response: { 201: z.object({ success: z.literal(true), data: z.any() }) },
            },
            handler: async (request, reply) => {
                const question = await qaService.askQuestion(request.user.id, request.body);
                return reply.code(201).send(success(question));
            },
        });

        app.post('/answers', {
            schema: {
                body: CreateAnswerSchema,
                response: { 201: z.object({ success: z.literal(true), data: z.any() }) },
            },
            handler: async (request, reply) => {
                // Check if user is admin for official status
                const isOfficial = request.user.role === 'admin';
                const answer = await qaService.answerQuestion(request.user.id, {
                    ...request.body,
                    isOfficial,
                });
                return reply.code(201).send(success(answer));
            },
        });
    }, { prefix: '/qa' });
};

export default qaRoutes;

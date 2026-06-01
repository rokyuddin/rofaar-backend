import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { qaService } from './service.js';
import { CreateQuestionSchema, CreateAnswerSchema } from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const qaRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Public Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();

      app.get("/product/:id", {
        schema: {
          tags: ["Q&A"],
          summary: "List product questions",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          const questions = await qaService.listByProduct(request.params.id);
          return reply.sendOk(questions);
        },
      });

      // ─── Protected Routes (Inside Public Prefix) ──────────────────────────
      fastify.register(async (protectedInstance) => {
        const protectedApp = protectedInstance.withTypeProvider<ZodTypeProvider>();
        protectedApp.addHook("onRequest", fastify.authenticate);

        protectedApp.post("/", {
          schema: {
            tags: ["Q&A"],
            summary: "Ask a question",
            body: CreateQuestionSchema,
          },
          handler: async (request, reply) => {
            const question = await qaService.askQuestion(
              request.user.id,
              request.body,
            );
            return reply.sendCreated(question);
          },
        });
      });
    },
    { prefix: "/qa" },
  );

  // ─── Admin Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();
      app.addHook("onRequest", fastify.authenticate);

      app.post("/answer", {
        preHandler: [fastify.requirePermission("update", "products")],
        schema: {
          tags: ["Admin | Q&A"],
          summary: "Answer a question",
          body: CreateAnswerSchema,
        },
        handler: async (request, reply) => {
          const answer = await qaService.answerQuestion(
            request.user.id,
            request.body,
          );
          return reply.sendCreated(answer);
        },
      });
    },
    { prefix: "/admin/qa" },
  );
};

export default qaRoutes;

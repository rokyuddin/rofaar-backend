import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { advertisementService } from './service.js';
import { CreateAdvertisementSchema, UpdateAdvertisementSchema } from './schema.js';
import { IdParamSchema } from '@/shared/types.js';
import { z } from 'zod';

const advertisementRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Public Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();

      app.get("/", {
        schema: {
          tags: ["Admin | Ads"],
          summary: "List advertisements",
          querystring: z.object({ position: z.string().optional() }),
        },
        handler: async (request, reply) => {
          const ads = await advertisementService.list({
            position: request.query.position,
          });
          return reply.sendOk(ads);
        },
      });
    },
    { prefix: "/advertisements" },
  );

  // ─── Admin Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();
      app.addHook("onRequest", fastify.authenticate);

      app.get("/all", {
        preHandler: [fastify.requirePermission("read", "advertisements")],
        schema: {
          tags: ["Admin | Ads"],
          summary: "List all advertisements (Admin)",
        },
        handler: async (_request, reply) => {
          const ads = await advertisementService.list({ onlyActive: false });
          return reply.sendOk(ads);
        },
      });

      app.post("/", {
        preHandler: [fastify.requirePermission("create", "advertisements")],
        schema: {
          tags: ["Admin | Ads"],
          summary: "Create advertisement",
          body: CreateAdvertisementSchema,
        },
        handler: async (request, reply) => {
          const ad = await advertisementService.create(request.body);
          return reply.sendCreated(ad);
        },
      });

      app.put("/:id", {
        preHandler: [fastify.requirePermission("update", "advertisements")],
        schema: {
          tags: ["Admin | Ads"],
          summary: "Update advertisement",
          params: IdParamSchema,
          body: UpdateAdvertisementSchema,
        },
        handler: async (request, reply) => {
          const ad = await advertisementService.update(
            request.params.id,
            request.body,
          );
          return reply.sendOk(ad);
        },
      });

      app.delete("/:id", {
        preHandler: [fastify.requirePermission("delete", "advertisements")],
        schema: {
          tags: ["Admin | Ads"],
          summary: "Delete advertisement",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          await advertisementService.delete(request.params.id);
          return reply.sendOk(null, "Advertisement deleted successfully");
        },
      });
    },
    { prefix: "/admin/advertisements" },
  );
};

export default advertisementRoutes;

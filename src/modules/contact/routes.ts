import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { contactService } from './service.js';
import { CreateContactSubmissionSchema, UpdateContactStatusSchema } from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const contactRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Public Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();

      app.post("/", {
        schema: {
          tags: ["Contact"],
          summary: "Submit contact form",
          body: CreateContactSubmissionSchema,
        },
        handler: async (request, reply) => {
          const result = await contactService.create(request.body);
          return reply.sendCreated(
            result,
            "Thank you for your message. We will get back to you soon.",
          );
        },
      });
    },
    { prefix: "/contact" },
  );

  // ─── Admin Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();
      app.addHook("onRequest", fastify.authenticate);

      app.get("/", {
        preHandler: [fastify.requirePermission("read", "contacts")],
        schema: {
          tags: ["Admin | Contacts"],
          summary: "List contact submissions",
        },
        handler: async (_request, reply) => {
          const result = await contactService.list();
          return reply.sendOk(result);
        },
      });

      app.patch("/:id/status", {
        preHandler: [fastify.requirePermission("update", "contacts")],
        schema: {
          tags: ["Admin | Contacts"],
          summary: "Update contact status",
          params: IdParamSchema,
          body: UpdateContactStatusSchema,
        },
        handler: async (request, reply) => {
          const result = await contactService.updateStatus(
            request.params.id,
            request.body.status,
          );
          return reply.sendOk(result);
        },
      });

      app.delete("/:id", {
        preHandler: [fastify.requirePermission("delete", "contacts")],
        schema: {
          tags: ["Admin | Contacts"],
          summary: "Delete contact submission",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          await contactService.delete(request.params.id);
          return reply.sendOk(null, "Submission deleted successfully");
        },
      });
    },
    { prefix: "/admin/contact" },
  );
};

export default contactRoutes;

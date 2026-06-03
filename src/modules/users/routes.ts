import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { userService } from './service.js';
import { UpdateProfileSchema, AdminUpdateUserSchema } from './schema.js';
import { IdParamSchema } from '@/shared/types.js';
import { z } from 'zod';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Protected Routes ───────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();
      app.addHook("onRequest", fastify.authenticate);

      app.patch("/profile", {
        schema: {
          tags: ["Profile"],
          summary: "Update user profile",
          body: UpdateProfileSchema,
        },
        handler: async (request, reply) => {
          const user = await userService.updateProfile(
            request.user.id,
            request.body,
          );
          return reply.sendOk(user);
        },
      });

      app.delete("/account", {
        schema: {
          tags: ["Profile"],
          summary: "Delete account",
        },
        handler: async (request, reply) => {
          await userService.deleteAccount(request.user.id);
          return reply.sendOk(null, "Account deleted successfully");
        },
      });
    },
    { prefix: "/users" },
  );

  // ─── Admin Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();
      app.addHook("onRequest", fastify.authenticate);
      app.addHook("onRequest", fastify.adminOnly);

      app.get("/", {
        schema: {
          tags: ["Admin | Users"],
          summary: "List users",
          description: "Returns all users. Optionally filter by registration status.",
          querystring: z.object({
            status: z.enum(['pending', 'completed', 'all']).optional(),
          }),
        },
        handler: async (request, reply) => {
          const { status } = request.query as { status?: string };
          const users = await userService.adminList(status);
          return reply.sendOk(users);
        },
      });

      app.get("/:id", {
        schema: {
          tags: ["Admin | Users"],
          summary: "Get user by ID",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          const user = await userService.adminGetById(request.params.id);
          return reply.sendOk(user);
        },
      });

      app.put("/:id", {
        schema: {
          tags: ["Admin | Users"],
          summary: "Update user",
          description: "Update user profile, role, or status (isActive, isVerified).",
          params: IdParamSchema,
          body: AdminUpdateUserSchema,
        },
        handler: async (request, reply) => {
          const user = await userService.adminUpdate(request.params.id, request.body);
          return reply.sendOk(user);
        },
      });

      app.patch("/:id/approve", {
        schema: {
          tags: ["Admin | Users"],
          summary: "Approve pending user",
          description: "Approves a pending user registration. Sets registrationStep to 'completed' and isVerified to true.",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          const user = await userService.approveUser(request.params.id);
          return reply.sendOk(user, "User approved successfully");
        },
      });

      app.patch("/:id/reject", {
        schema: {
          tags: ["Admin | Users"],
          summary: "Reject pending user",
          description: "Rejects and deletes a pending user registration.",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          await userService.rejectUser(request.params.id);
          return reply.sendOk(null, "User rejected and deleted successfully");
        },
      });

      app.delete("/:id", {
        schema: {
          tags: ["Admin | Users"],
          summary: "Delete user",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          await userService.adminDelete(request.params.id);
          return reply.sendOk(null, "User deleted successfully");
        },
      });
    },
    { prefix: "/admin/users" },
  );
};

export default userRoutes;

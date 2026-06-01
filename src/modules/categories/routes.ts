import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { categoryService } from "./service.js";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CategoryParamsSchema,
  AdminCategoryParamsSchema,
} from "./schema.js";
import { IdParamSchema, SlugParamSchema } from "@/shared/types.js";

const categoryRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Public Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();

      app.get("/", {
        schema: {
          tags: ["Categories"],
          summary: "List categories",
          description: "Returns a paginated list of active categories.",
          querystring: CategoryParamsSchema,
        },
        handler: async (request, reply) => {
          const { rows, total } = await categoryService.list(request.query);
          return reply.sendPaginated(rows, {
            page: request.query.page,
            limit: request.query.limit,
            total,
          });
        },
      });

      app.get("/:slug", {
        schema: {
          tags: ["Categories"],
          summary: "Get category by slug",
          description: "Returns a single category by its slug.",
          params: SlugParamSchema,
        },
        handler: async (request, reply) => {
          const category = await categoryService.getBySlug(request.params.slug);
          return reply.sendOk(category);
        },
      });
    },
    { prefix: "/categories" },
  );

  // ─── Admin Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();
      app.addHook("onRequest", fastify.authenticate);

      app.get("/", {
        preHandler: [fastify.requirePermission("read", "categories")],
        schema: {
          tags: ["Admin | Categories"],
          summary: "List categories (Admin)",
          description: "Returns a paginated list of all categories.",
          querystring: AdminCategoryParamsSchema,
        },
        handler: async (request, reply) => {
          const { rows, total } = await categoryService.adminList(request.query);
          return reply.sendPaginated(rows, {
            page: request.query.page,
            limit: request.query.limit,
            total,
          });
        },
      });

      app.post("/", {
        preHandler: [fastify.requirePermission("create", "categories")],
        schema: {
          tags: ["Admin | Categories"],
          summary: "Create category",
          body: CreateCategorySchema,
        },
        handler: async (request, reply) => {
          const category = await categoryService.create(request.body);
          return reply.sendCreated(category);
        },
      });

      app.put("/:id", {
        preHandler: [fastify.requirePermission("update", "categories")],
        schema: {
          tags: ["Admin | Categories"],
          summary: "Update category",
          params: IdParamSchema,
          body: UpdateCategorySchema,
        },
        handler: async (request, reply) => {
          const category = await categoryService.update(
            request.params.id,
            request.body,
          );
          return reply.sendOk(category);
        },
      });

      app.delete("/:id", {
        preHandler: [fastify.requirePermission("delete", "categories")],
        schema: {
          tags: ["Admin | Categories"],
          summary: "Delete category",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          await categoryService.delete(request.params.id);
          return reply.sendOk(null, "Category deleted successfully");
        },
      });
    },
    { prefix: "/admin/categories" },
  );
};

export default categoryRoutes;

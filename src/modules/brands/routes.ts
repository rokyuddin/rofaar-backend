import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { brandService } from "./service.js";
import {
  CreateBrandSchema,
  UpdateBrandSchema,
  BrandParamsSchema,
  AdminBrandParamsSchema,
} from "./schema.js";
import { IdParamSchema, SlugParamSchema } from "@/shared/types.js";

const brandRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Public Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();

      app.get("/", {
        schema: {
          tags: ["Brands"],
          summary: "List brands",
          description: "Returns a paginated list of active brands.",
          querystring: BrandParamsSchema,
        },
        handler: async (request, reply) => {
          const { rows, total } = await brandService.list(request.query);
          return reply.sendPaginated(rows, {
            page: request.query.page,
            limit: request.query.limit,
            total,
          });
        },
      });

      app.get("/:slug", {
        schema: {
          tags: ["Brands"],
          summary: "Get brand by slug",
          description: "Returns a single brand by its slug.",
          params: SlugParamSchema,
        },
        handler: async (request, reply) => {
          const brand = await brandService.getBySlug(request.params.slug);
          return reply.sendOk(brand);
        },
      });
    },
    { prefix: "/brands" },
  );

  // ─── Admin Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();
      app.addHook("onRequest", fastify.authenticate);

      app.get("/", {
        preHandler: [fastify.requirePermission("read", "brands")],
        schema: {
          tags: ["Admin | Brands"],
          summary: "List brands (Admin)",
          description: "Returns a paginated list of all brands.",
          querystring: AdminBrandParamsSchema,
        },
        handler: async (request, reply) => {
          const { rows, total } = await brandService.adminList(request.query);
          return reply.sendPaginated(rows, {
            page: request.query.page,
            limit: request.query.limit,
            total,
          });
        },
      });

      app.post("/", {
        preHandler: [fastify.requirePermission("create", "brands")],
        schema: {
          tags: ["Admin | Brands"],
          summary: "Create brand",
          body: CreateBrandSchema,
        },
        handler: async (request, reply) => {
          const brand = await brandService.create(request.body);
          return reply.sendCreated(brand);
        },
      });

      app.put("/:id", {
        preHandler: [fastify.requirePermission("update", "brands")],
        schema: {
          tags: ["Admin | Brands"],
          summary: "Update brand",
          params: IdParamSchema,
          body: UpdateBrandSchema,
        },
        handler: async (request, reply) => {
          const brand = await brandService.update(request.params.id, request.body);
          return reply.sendOk(brand);
        },
      });

      app.delete("/:id", {
        preHandler: [fastify.requirePermission("delete", "brands")],
        schema: {
          tags: ["Admin | Brands"],
          summary: "Delete brand",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          await brandService.delete(request.params.id);
          return reply.sendOk(null, "Brand deleted successfully");
        },
      });
    },
    { prefix: "/admin/brands" },
  );
};

export default brandRoutes;

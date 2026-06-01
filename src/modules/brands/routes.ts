import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { brandService } from "./service.js";
import {
  CreateBrandSchema,
  UpdateBrandSchema,
  BrandParamsSchema,
  AdminBrandParamsSchema,
  type FileUpload,
} from "./schema.js";
import { IdParamSchema, SlugParamSchema } from "@/shared/types.js";
import { BadRequestError } from "@/shared/errors.js";

const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB for brands

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
          description: "Creates a new brand with an optional logo image.",
        },
        handler: async (request, reply) => {
          const parts = request.parts();
          const body: any = {};
          let imageFile: FileUpload | undefined;

          for await (const part of parts) {
            if (part.type === "file") {
              if (!ALLOWED_MIMETYPES.includes(part.mimetype)) {
                throw new BadRequestError(`Invalid file type: ${part.mimetype}`);
              }

              const buffer = await part.toBuffer();
              if (buffer.length > MAX_FILE_SIZE) {
                throw new BadRequestError(
                  `File too large: ${part.filename} exceeds 2MB`,
                );
              }

              imageFile = {
                filename: part.filename,
                mimetype: part.mimetype,
                data: buffer,
              };
            } else {
              body[part.fieldname] = part.value;
            }
          }

          const payload = {
            ...body,
            isActive:
              body.isActive === "true"
                ? true
                : body.isActive === "false"
                  ? false
                  : undefined,
          };

          const validatedData = CreateBrandSchema.parse(payload);
          const brand = await brandService.create({
            ...validatedData,
            ...(imageFile ? { imageFile } : {}),
          });
          return reply.sendCreated(brand);
        },
      });

      app.put("/:id", {
        preHandler: [fastify.requirePermission("update", "brands")],
        schema: {
          tags: ["Admin | Brands"],
          summary: "Update brand",
          description: "Updates a brand, optionally including a new logo image.",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          const parts = request.parts();
          const body: any = {};
          let imageFile: FileUpload | undefined;

          for await (const part of parts) {
            if (part.type === "file") {
              if (!ALLOWED_MIMETYPES.includes(part.mimetype)) {
                throw new BadRequestError(`Invalid file type: ${part.mimetype}`);
              }

              const buffer = await part.toBuffer();
              if (buffer.length > MAX_FILE_SIZE) {
                throw new BadRequestError(
                  `File too large: ${part.filename} exceeds 2MB`,
                );
              }

              imageFile = {
                filename: part.filename,
                mimetype: part.mimetype,
                data: buffer,
              };
            } else {
              body[part.fieldname] = part.value;
            }
          }

          const payload = {
            ...body,
            isActive:
              body.isActive === "true"
                ? true
                : body.isActive === "false"
                  ? false
                  : undefined,
          };

          const validatedData = UpdateBrandSchema.parse(payload);
          const brand = await brandService.update(request.params.id, {
            ...validatedData,
            ...(imageFile ? { imageFile } : {}),
          });
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

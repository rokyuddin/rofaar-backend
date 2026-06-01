import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { categoryService } from "./service.js";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CategoryParamsSchema,
  AdminCategoryParamsSchema,
  type FileUpload,
} from "./schema.js";
import { IdParamSchema, SlugParamSchema } from "@/shared/types.js";
import { BadRequestError } from "@/shared/errors.js";

const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB for categories

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
          description: "Creates a new category with an optional image.",
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

          const validatedData = CreateCategorySchema.parse(payload);
          const category = await categoryService.create({
            ...validatedData,
            ...(imageFile ? { imageFile } : {}),
          });
          return reply.sendCreated(category);
        },
      });

      app.put("/:id", {
        preHandler: [fastify.requirePermission("update", "categories")],
        schema: {
          tags: ["Admin | Categories"],
          summary: "Update category",
          description: "Updates a category, optionally including a new image.",
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

          const validatedData = UpdateCategorySchema.parse(payload);
          const category = await categoryService.update(request.params.id, {
            ...validatedData,
            ...(imageFile ? { imageFile } : {}),
          });
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

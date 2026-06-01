import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { bannerService } from './service.js';
import {
  CreateBannerSchema,
  UpdateBannerSchema,
  type FileUpload,
} from "./schema.js";
import { IdParamSchema } from "@/shared/types.js";
import { BadRequestError } from "@/shared/errors.js";

const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for banners

const bannerRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Public Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();

      app.get("/", {
        schema: {
          tags: ["Banners"],
          summary: "List banners",
          description: "Returns all active banners.",
        },
        handler: async (_request, reply) => {
          const banners = await bannerService.list();
          return reply.sendOk(banners);
        },
      });
    },
    { prefix: "/banners" },
  );

  // ─── Admin Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();
      app.addHook("onRequest", fastify.authenticate);

      app.get("/", {
        preHandler: [fastify.requirePermission("read", "banners")],
        schema: {
          tags: ["Admin | Banners"],
          summary: "List all banners (Admin)",
          description: "Returns all banners including inactive ones.",
        },
        handler: async (_request, reply) => {
          const banners = await bannerService.list(false);
          return reply.sendOk(banners);
        },
      });

      app.post("/", {
        preHandler: [fastify.requirePermission("create", "banners")],
        schema: {
          tags: ["Admin | Banners"],
          summary: "Create banner",
          description: "Creates a new banner with an optional image.",
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
                  `File too large: ${part.filename} exceeds 5MB`,
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
            sortOrder: body.sortOrder ? Number(body.sortOrder) : undefined,
            isActive:
              body.isActive === "true"
                ? true
                : body.isActive === "false"
                  ? false
                  : undefined,
          };

          const validatedData = CreateBannerSchema.parse(payload);
          const banner = await bannerService.create({
            ...validatedData,
            ...(imageFile ? { imageFile } : {}),
          });
          return reply.sendCreated(banner);
        },
      });

      app.put("/:id", {
        preHandler: [fastify.requirePermission("update", "banners")],
        schema: {
          tags: ["Admin | Banners"],
          summary: "Update banner",
          description: "Updates a banner, optionally including a new image.",
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
                  `File too large: ${part.filename} exceeds 5MB`,
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
            sortOrder: body.sortOrder ? Number(body.sortOrder) : undefined,
            isActive:
              body.isActive === "true"
                ? true
                : body.isActive === "false"
                  ? false
                  : undefined,
          };

          const validatedData = UpdateBannerSchema.parse(payload);
          const banner = await bannerService.update(request.params.id, {
            ...validatedData,
            ...(imageFile ? { imageFile } : {}),
          });
          return reply.sendOk(banner);
        },
      });

      app.delete("/:id", {
        preHandler: [fastify.requirePermission("delete", "banners")],
        schema: {
          tags: ["Admin | Banners"],
          summary: "Delete banner",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          await bannerService.delete(request.params.id);
          return reply.sendOk(null, "Banner deleted successfully");
        },
      });
    },
    { prefix: "/admin/banners" },
  );
};

export default bannerRoutes;

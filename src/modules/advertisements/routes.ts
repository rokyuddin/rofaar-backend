import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { advertisementService } from './service.js';
import {
  CreateAdvertisementSchema,
  UpdateAdvertisementSchema,
  type FileUpload,
} from './schema.js';
import { IdParamSchema } from '@/shared/types.js';
import { BadRequestError } from '@/shared/errors.js';
import { z } from 'zod';

const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for advertisements

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
          description: "Creates a new advertisement with an optional image.",
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
            isActive:
              body.isActive === "true"
                ? true
                : body.isActive === "false"
                  ? false
                  : undefined,
          };

          const validatedData = CreateAdvertisementSchema.parse(payload);
          const ad = await advertisementService.create({
            ...validatedData,
            ...(imageFile ? { imageFile } : {}),
          });
          return reply.sendCreated(ad);
        },
      });

      app.put("/:id", {
        preHandler: [fastify.requirePermission("update", "advertisements")],
        schema: {
          tags: ["Admin | Ads"],
          summary: "Update advertisement",
          description:
            "Updates an advertisement, optionally including a new image.",
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
            isActive:
              body.isActive === "true"
                ? true
                : body.isActive === "false"
                  ? false
                  : undefined,
          };

          const validatedData = UpdateAdvertisementSchema.parse(payload);
          const ad = await advertisementService.update(request.params.id, {
            ...validatedData,
            ...(imageFile ? { imageFile } : {}),
          });
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

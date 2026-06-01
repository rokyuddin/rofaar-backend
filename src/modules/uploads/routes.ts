import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { uploadService } from "@/shared/services/upload.js";

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();
      app.addHook("onRequest", fastify.authenticate);

      app.post("/image", {
        preHandler: [fastify.requirePermission("create", "products")],
        schema: {
          tags: ["Admin | Uploads"],
          summary: "Upload image file",
          description: "Uploads an image file to Cloudflare R2 and returns the public URL.",
        },
        handler: async (request, reply) => {
          const parts = request.parts();
          const files: Buffer[] = [];
          let filename = "";
          let mimetype = "";

          for await (const part of parts) {
            if (part.file) {
              filename = part.filename;
              mimetype = part.mimetype;
              files.push(part.file);
            }
          }

          if (files.length === 0) {
            return reply.code(400).send({
              success: false,
              message: "No file uploaded",
            });
          }

          const url = await uploadService.uploadFile(filename, mimetype, files[0]);
          return reply.sendCreated({ url });
        },
      });
    },
    { prefix: "/uploads" },
  );
};

export default uploadRoutes;
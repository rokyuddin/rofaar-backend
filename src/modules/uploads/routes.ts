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
          let fileBuffer: Buffer | undefined;
          let filename = "";
          let mimetype = "";

          for await (const part of parts) {
            if (part.type === "file") {
              filename = part.filename;
              mimetype = part.mimetype;
              fileBuffer = await part.toBuffer();
              break;
            }
          }

          if (!fileBuffer) {
            return reply.code(400).send({
              success: false,
              message: "No file uploaded",
            });
          }

          const url = await uploadService.uploadFile(filename, mimetype, fileBuffer);
          return reply.sendCreated({ url });
        },
      });
    },
    { prefix: "/uploads" },
  );
};

export default uploadRoutes;

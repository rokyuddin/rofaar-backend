import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { productService } from "./service.js";
import { recommendationService } from "./recommendations.service.js";
import {
  ProductParamsSchema,
  SlugParamSchema,
  AdminProductParamsSchema,
  CreateProductSchema,
  UpdateProductSchema,
  BulkImportResponseSchema,
  SortImagesSchema,
  ImageIdParamSchema,
  BULK_IMPORT_MAX_FILE_SIZE,
  type FileUpload,
} from "./schema.js";
import { IdParamSchema } from "@/shared/types.js";
import { BadRequestError } from "@/shared/errors.js";
import { z } from "zod";

const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const productRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Public Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();

      app.get("/", {
        schema: {
          tags: ["Products"],
          summary: "List products",
          description:
            "Returns a paginated list of products with optional filters for search, category, brand, and price.",
          querystring: ProductParamsSchema,
        },
        handler: async (request, reply) => {
          const { rows, total } = await productService.list(request.query);
          return reply.sendPaginated(rows, {
            page: request.query.page,
            limit: request.query.limit,
            total,
          });
        },
      });

      app.get("/:slug", {
        schema: {
          tags: ["Products"],
          summary: "Get product detail",
          description:
            "Returns the detailed information of a product identified by its unique slug.",
          params: SlugParamSchema,
        },
        handler: async (request, reply) => {
          const product = await productService.getBySlug(request.params.slug);
          const userId = (request as { user?: { id: string } }).user?.id;
          recommendationService
            .logView(userId, product.id)
            .catch(console.error);
          return reply.sendOk(product);
        },
      });

      app.get("/:id/related", {
        schema: {
          tags: ["Products"],
          summary: "Get related products",
          description:
            "Returns a list of products related to the specified product ID.",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          const related = await recommendationService.getRelatedProducts(
            request.params.id,
          );
          return reply.sendOk(related);
        },
      });

      app.get("/recently-viewed", {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ["Products"],
          summary: "Get recently viewed products",
          description:
            "Returns a list of products recently viewed by the authenticated user.",
        },
        handler: async (request, reply) => {
          const recent = await recommendationService.getRecentlyViewed(
            request.user.id,
          );
          return reply.sendOk(recent);
        },
      });
    },
    { prefix: "/products" },
  );

  // Admin Routes
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();
      app.addHook("onRequest", fastify.authenticate);

      app.get("/", {
        preHandler: [fastify.requirePermission("read", "products")],
        schema: {
          tags: ["Admin | Products"],
          summary: "List products (Admin)",
          description:
            "Returns a paginated list of all products, including inactive ones.",
          querystring: AdminProductParamsSchema,
        },
        handler: async (request, reply) => {
          const { rows, total } = await productService.adminList(request.query);
          return reply.sendPaginated(rows, {
            page: request.query.page,
            limit: request.query.limit,
            total,
          });
        },
      });

      app.post("/", {
        preHandler: [fastify.requirePermission("create", "products")],
        schema: {
          tags: ["Admin | Products"],
          summary: "Create product",
          description: "Creates a new product in the catalog with images.",
        },
        handler: async (request, reply) => {
          const parts = request.parts();
          const body: any = {};
          const imageFiles: FileUpload[] = [];

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

              imageFiles.push({
                filename: part.filename,
                mimetype: part.mimetype,
                data: buffer,
              });
            } else {
              body[part.fieldname] = part.value;
            }
          }

          // Convert types for multipart fields
          const payload = {
            ...body,
            price: body.price ? Number(body.price) : undefined,
            costPrice: body.costPrice ? Number(body.costPrice) : undefined,
            discountPercentage: body.discountPercentage
              ? Number(body.discountPercentage)
              : undefined,
            stock: body.stock ? Number(body.stock) : undefined,
            isActive:
              body.isActive === "true"
                ? true
                : body.isActive === "false"
                  ? false
                  : undefined,
          };

          const validatedData = CreateProductSchema.parse(payload);
          const product = await productService.create({
            ...validatedData,
            imageFiles,
          });
          return reply.sendCreated(product);
        },
      });

      app.post("/bulk-import", {
        preHandler: [fastify.requirePermission("create", "products")],
        schema: {
          tags: ["Admin | Products"],
          summary: "Bulk import products from CSV/XLSX",
          description:
            "Accepts a multipart upload with a single file (CSV or XLSX). Up to 500 rows. Validates each row, looks up category/brand, and creates products. Stops on the first invalid row and returns row-level error details. On full success, returns the created products.",
          response: {
            200: BulkImportResponseSchema,
            207: BulkImportResponseSchema,
          },
          consumes: ["multipart/form-data"],
        },
        handler: async (request, reply) => {
          const file = await request.file();
          if (!file) {
            throw new BadRequestError(
              "No file uploaded. Send a multipart/form-data request with a 'file' field.",
            );
          }

          if (file.fieldname !== "file") {
            throw new BadRequestError(
              `Unexpected field "${file.fieldname}". Use field name "file".`,
            );
          }

          const filename = file.filename || "";
          const lowerName = filename.toLowerCase();
          const isCsv = lowerName.endsWith(".csv") || file.mimetype === "text/csv";
          const isXlsx =
            lowerName.endsWith(".xlsx") ||
            lowerName.endsWith(".xls") ||
            file.mimetype.includes("spreadsheetml") ||
            file.mimetype === "application/vnd.ms-excel";
          if (!isCsv && !isXlsx) {
            throw new BadRequestError(
              `Unsupported file type: ${file.mimetype || "unknown"}. Allowed: CSV (.csv) or XLSX (.xlsx, .xls).`,
            );
          }

          const buffer = await file.toBuffer();
          if (buffer.length > BULK_IMPORT_MAX_FILE_SIZE) {
            throw new BadRequestError(
              `File too large (${(buffer.length / 1024 / 1024).toFixed(2)}MB). Max is ${BULK_IMPORT_MAX_FILE_SIZE / 1024 / 1024}MB.`,
            );
          }

          const result = await productService.bulkImport(
            buffer,
            filename,
            file.mimetype,
          );

          if (result.failedAtRow !== null) {
            return reply.status(207).send(result);
          }
          return reply.send(result);
        },
      });

      app.get("/bulk-import/template", {
        preHandler: [fastify.requirePermission("create", "products")],
        schema: {
          tags: ["Admin | Products"],
          summary: "Download bulk import template",
          description:
            "Returns a sample CSV or XLSX file with the required columns and a sample row. Use as a starting point for bulk imports.",
          querystring: z.object({
            format: z
              .enum(["csv", "xlsx"])
              .default("csv")
              .describe("Template format: csv (default) or xlsx"),
          }),
        },
        handler: async (request, reply) => {
          const { format } = request.query;
          const tpl = await productService.getImportTemplate(format);
          return reply
            .header("Content-Type", tpl.contentType)
            .header(
              "Content-Disposition",
              `attachment; filename="${tpl.filename}"`,
            )
            .send(tpl.buffer);
        },
      });

      app.put("/:id", {
        preHandler: [fastify.requirePermission("update", "products")],
        schema: {
          tags: ["Admin | Products"],
          summary: "Update product",
          description:
            "Updates an existing product in the catalog, including images.",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          const parts = request.parts();
          const body: any = {};
          const imageFiles: FileUpload[] = [];

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

              imageFiles.push({
                filename: part.filename,
                mimetype: part.mimetype,
                data: buffer,
              });
            } else {
              body[part.fieldname] = part.value;
            }
          }

          // Convert types for multipart fields
          const payload = {
            ...body,
            price: body.price ? Number(body.price) : undefined,
            costPrice: body.costPrice ? Number(body.costPrice) : undefined,
            discountPercentage: body.discountPercentage
              ? Number(body.discountPercentage)
              : undefined,
            stock: body.stock ? Number(body.stock) : undefined,
            isActive:
              body.isActive === "true"
                ? true
                : body.isActive === "false"
                  ? false
                  : undefined,
            // Handle existing images if passed as JSON string
            images: body.images ? JSON.parse(body.images) : undefined,
          };

          const validatedData = UpdateProductSchema.parse(payload);
          const product = await productService.update(request.params.id, {
            ...validatedData,
            imageFiles,
          });
          return reply.sendOk(product);
        },
      });

      app.get("/:id/images", {
        preHandler: [fastify.requirePermission("read", "products")],
        schema: {
          tags: ["Admin | Products"],
          summary: "List product images",
          description: "Returns all images for a product, sorted by sort order.",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          const images = await productService.listImages(request.params.id);
          return reply.sendOk(images);
        },
      });

      app.put("/:id/images/sort", {
        preHandler: [fastify.requirePermission("update", "products")],
        schema: {
          tags: ["Admin | Products"],
          summary: "Reorder product images",
          description:
            "Updates the display order of a product's images. Provide an array of image IDs with their new sort positions.",
          params: IdParamSchema,
          body: SortImagesSchema,
        },
        handler: async (request, reply) => {
          const images = await productService.reorderImages(
            request.params.id,
            request.body.images,
          );
          return reply.sendOk(images);
        },
      });

      app.post("/:id/images", {
        preHandler: [fastify.requirePermission("update", "products")],
        schema: {
          tags: ["Admin | Products"],
          summary: "Upload product images",
          description:
            "Uploads one or more images for an existing product. Accepts multipart/form-data with one or more file fields. Images are appended to the existing image set.",
          params: IdParamSchema,
          consumes: ["multipart/form-data"],
        },
        handler: async (request, reply) => {
          const parts = request.parts();
          const imageFiles: FileUpload[] = [];

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
              imageFiles.push({
                filename: part.filename,
                mimetype: part.mimetype,
                data: buffer,
              });
            }
          }

          if (imageFiles.length === 0) {
            throw new BadRequestError(
              "No image files uploaded. Send at least one file field.",
            );
          }

          const images = await productService.uploadImages(
            request.params.id,
            imageFiles,
          );
          return reply.sendCreated(images);
        },
      });

      app.delete("/:id/images/:imageId", {
        preHandler: [fastify.requirePermission("update", "products")],
        schema: {
          tags: ["Admin | Products"],
          summary: "Delete product image",
          description:
            "Deletes a single image from a product's image set. If the image was uploaded to R2, it is also cleaned up.",
          params: ImageIdParamSchema,
        },
        handler: async (request, reply) => {
          const images = await productService.deleteImage(
            request.params.id,
            request.params.imageId,
          );
          return reply.sendOk(images);
        },
      });

      app.delete("/:id", {
        preHandler: [fastify.requirePermission("delete", "products")],
        schema: {
          tags: ["Admin | Products"],
          summary: "Delete product",
          description: "Permanently deletes a product from the catalog.",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          await productService.delete(request.params.id);
          return reply.sendOk(null, "Product deleted successfully");
        },
      });
    },
    { prefix: "/admin/products" },
  );
};

export default productRoutes;

// export const productAdminRoutes: FastifyPluginAsync = async (fastify) => {};

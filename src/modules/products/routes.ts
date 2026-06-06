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
    NewArrivalsParamsSchema,
    BULK_IMPORT_MAX_FILE_SIZE,
    CreateVariantSchema,
    UpdateVariantSchema,
    VariantIdParamSchema,
    SetVariantAttributesSchema,
    CreateAttributeSchema,
    UpdateAttributeSchema,
    AttributeIdParamSchema,
    AttributeValueIdParamSchema,
    CreateAttributeValueSchema,
    CreateSpecSchema,
    UpdateSpecSchema,
    SpecIdParamSchema,
    IdParamSchema,
    ProductLookupParamSchema,
    type FileUpload,
} from "./schema.js";
import { UuidSchema } from "@/shared/types.js";
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
                        "Returns a paginated list of products with optional filters for search, category, brand, price, and has_variants.",
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

            app.get("/new-arrivals", {
                schema: {
                    tags: ["Products"],
                    summary: "New arrivals",
                    description:
                        "Returns the most recently added published products, ordered by creation date descending.",
                    querystring: NewArrivalsParamsSchema,
                },
                handler: async (request, reply) => {
                    const products = await productService.getNewArrivals(request.query);
                    return reply.sendOk(products);
                },
            });

            app.get("/:slug", {
                schema: {
                    tags: ["Products"],
                    summary: "Get product detail",
                    description:
                        "Returns the detailed information of a product identified by its ID (UUID) or unique slug. Response shape varies based on has_variants.",
                    params: SlugParamSchema,
                },
                handler: async (request, reply) => {
                    const param = request.params.slug;
                    const uuidResult = UuidSchema.safeParse(param);
                    const product = uuidResult.success
                        ? await productService.getById(param)
                        : await productService.getBySlug(param);
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
                    description: "Returns a list of products related to the specified product ID.",
                    params: IdParamSchema,
                },
                handler: async (request, reply) => {
                    const related = await recommendationService.getRelatedProducts(
                        request.params.id,
                    );
                    return reply.sendOk(related);
                },
            });

            app.get("/:id/variants", {
                schema: {
                    tags: ["Products"],
                    summary: "List active variants of a product",
                    description:
                        "Returns all active variants for a product. Customers use this to pick a variant before adding to cart.",
                    params: IdParamSchema,
                },
                handler: async (request, reply) => {
                    const variants = await productService.listVariants(request.params.id);
                    // Only return active variants to public
                    return reply.sendOk(variants.filter((v) => v.isActive));
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
                        "Returns a paginated list of all products, including drafts and archived. Filterable by status and has_variants.",
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

            app.get("/:id", {
                preHandler: [fastify.requirePermission("read", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Get product detail (Admin)",
                    description:
                        "Returns the detailed information of a product identified by its ID (UUID) or unique slug. Includes drafts and archived products.",
                    params: ProductLookupParamSchema,
                },
                handler: async (request, reply) => {
                    const param = request.params.id;
                    const uuidResult = UuidSchema.safeParse(param);
                    const product = uuidResult.success
                        ? await productService.getById(param)
                        : await productService.getBySlug(param);
                    return reply.sendOk(product);
                },
            });

            app.post("/", {
                preHandler: [fastify.requirePermission("create", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Create product",
                    description:
                        "Creates a new product in the catalog with images. If hasVariants is false, a default locked variant is auto-generated from price/stock. If hasVariants is true, optionally pass `variants[]` to create the initial set.",
                },
                handler: async (request, reply) => {
                    const parts = request.parts();
                    const body: any = {};
                    const imageFiles: FileUpload[] = [];

                    for await (const part of parts) {
                        if (part.type === "file") {
                            if (!ALLOWED_MIMETYPES.includes(part.mimetype)) {
                                throw new BadRequestError(
                                    `Invalid file type: ${part.mimetype}`,
                                );
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

                    const payload = {
                        ...body,
                        price: body.price ? Number(body.price) : undefined,
                        costPrice: body.costPrice ? Number(body.costPrice) : undefined,
                        discountPercentage: body.discountPercentage
                            ? Number(body.discountPercentage)
                            : undefined,
                        stock: body.stock ? Number(body.stock) : undefined,
                        weight: body.weight ? Number(body.weight) : undefined,
                        length: body.length ? Number(body.length) : undefined,
                        width: body.width ? Number(body.width) : undefined,
                        height: body.height ? Number(body.height) : undefined,
                        hasVariants:
                            body.hasVariants === undefined
                                ? undefined
                                : body.hasVariants === "true" || body.hasVariants === true,
                        freeShipping:
                            body.freeShipping === "true" || body.freeShipping === true,
                        images: body.images ? JSON.parse(body.images) : undefined,
                        variants: body.variants ? JSON.parse(body.variants) : undefined,
                        specs: body.specs ? JSON.parse(body.specs) : undefined,
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
                        "Updates an existing product. For has_variants=false products, the auto-generated default variant's price and stock are kept in sync with the product's price and stock.",
                    params: IdParamSchema,
                },
                handler: async (request, reply) => {
                    const parts = request.parts();
                    const body: any = {};
                    const imageFiles: FileUpload[] = [];

                    for await (const part of parts) {
                        if (part.type === "file") {
                            if (!ALLOWED_MIMETYPES.includes(part.mimetype)) {
                                throw new BadRequestError(
                                    `Invalid file type: ${part.mimetype}`,
                                );
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

                    const payload = {
                        ...body,
                        price: body.price ? Number(body.price) : undefined,
                        costPrice: body.costPrice ? Number(body.costPrice) : undefined,
                        discountPercentage: body.discountPercentage
                            ? Number(body.discountPercentage)
                            : undefined,
                        stock: body.stock ? Number(body.stock) : undefined,
                        weight: body.weight ? Number(body.weight) : undefined,
                        length: body.length ? Number(body.length) : undefined,
                        width: body.width ? Number(body.width) : undefined,
                        height: body.height ? Number(body.height) : undefined,
                        hasVariants:
                            body.hasVariants === undefined
                                ? undefined
                                : body.hasVariants === "true" || body.hasVariants === true,
                        freeShipping:
                            body.freeShipping === undefined
                                ? undefined
                                : body.freeShipping === "true" || body.freeShipping === true,
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
                                throw new BadRequestError(
                                    `Invalid file type: ${part.mimetype}`,
                                );
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

            // ─── Variants ──────────────────────────────────────────────────
            app.get("/:id/variants", {
                preHandler: [fastify.requirePermission("read", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "List product variants (Admin)",
                    description: "Returns all variants for a product, including inactive ones.",
                    params: IdParamSchema,
                },
                handler: async (request, reply) => {
                    const variants = await productService.listVariants(request.params.id);
                    return reply.sendOk(variants);
                },
            });

            app.post("/:id/variants", {
                preHandler: [fastify.requirePermission("create", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Create variant",
                    description:
                        "Adds a new variant to a product. The product must have hasVariants=true. If this is the first variant, it is auto-promoted to default.",
                    params: IdParamSchema,
                    body: CreateVariantSchema,
                },
                handler: async (request, reply) => {
                    const variant = await productService.addVariant(
                        request.params.id,
                        request.body,
                    );
                    return reply.sendCreated(variant);
                },
            });

            app.get("/:id/variants/:variantId", {
                preHandler: [fastify.requirePermission("read", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Get variant",
                    params: VariantIdParamSchema,
                },
                handler: async (request, reply) => {
                    return reply.sendOk(
                        await productService.getVariant(request.params.id, request.params.variantId),
                    );
                },
            });

            app.put("/:id/variants/:variantId", {
                preHandler: [fastify.requirePermission("update", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Update variant",
                    description:
                        "Updates a variant. Locked variants (the auto-generated default of a has_variants=false product) cannot be edited directly; edit the product instead.",
                    params: VariantIdParamSchema,
                    body: UpdateVariantSchema,
                },
                handler: async (request, reply) => {
                    return reply.sendOk(
                        await productService.updateVariant(
                            request.params.id,
                            request.params.variantId,
                            request.body,
                        ),
                    );
                },
            });

            app.delete("/:id/variants/:variantId", {
                preHandler: [fastify.requirePermission("delete", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Delete variant",
                    description:
                        "Deletes a variant. Locked variants and the default variant cannot be deleted.",
                    params: VariantIdParamSchema,
                },
                handler: async (request, reply) => {
                    await productService.deleteVariant(
                        request.params.id,
                        request.params.variantId,
                    );
                    return reply.sendOk(null, "Variant deleted successfully");
                },
            });

            app.put("/:id/variants/:variantId/attributes", {
                preHandler: [fastify.requirePermission("update", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Set variant attribute values",
                    description:
                        "Replaces the attribute values assigned to a variant. Pass an array of attribute value ids (or empty array to clear).",
                    params: VariantIdParamSchema,
                    body: SetVariantAttributesSchema,
                },
                handler: async (request, reply) => {
                    return reply.sendOk(
                        await productService.setVariantAttributes(
                            request.params.id,
                            request.params.variantId,
                            request.body.attributeValueIds,
                        ),
                    );
                },
            });

            // ─── Attributes (variant options like Color, Size) ──────────────
            app.get("/:id/attributes", {
                preHandler: [fastify.requirePermission("read", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "List product attributes (variant options)",
                    description: "Returns all variant option attributes for a product, with their values.",
                    params: IdParamSchema,
                },
                handler: async (request, reply) => {
                    return reply.sendOk(await productService.listAttributes(request.params.id));
                },
            });

            app.post("/:id/attributes", {
                preHandler: [fastify.requirePermission("create", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Create attribute (with values)",
                    description:
                        "Creates a new attribute (e.g. 'Color') with one or more values (e.g. 'Red', 'Blue') in one call.",
                    params: IdParamSchema,
                    body: CreateAttributeSchema,
                },
                handler: async (request, reply) => {
                    return reply.sendCreated(
                        await productService.addAttribute(request.params.id, request.body),
                    );
                },
            });

            app.put("/:id/attributes/:attributeId", {
                preHandler: [fastify.requirePermission("update", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Update attribute",
                    params: AttributeIdParamSchema,
                    body: UpdateAttributeSchema,
                },
                handler: async (request, reply) => {
                    return reply.sendOk(
                        await productService.updateAttribute(
                            request.params.id,
                            request.params.attributeId,
                            request.body,
                        ),
                    );
                },
            });

            app.delete("/:id/attributes/:attributeId", {
                preHandler: [fastify.requirePermission("delete", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Delete attribute (cascades to its values)",
                    params: AttributeIdParamSchema,
                },
                handler: async (request, reply) => {
                    await productService.deleteAttribute(
                        request.params.id,
                        request.params.attributeId,
                    );
                    return reply.sendOk(null, "Attribute deleted");
                },
            });

            app.post("/:id/attributes/:attributeId/values", {
                preHandler: [fastify.requirePermission("create", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Add value to attribute",
                    params: AttributeIdParamSchema,
                    body: CreateAttributeValueSchema,
                },
                handler: async (request, reply) => {
                    return reply.sendCreated(
                        await productService.addAttributeValue(
                            request.params.id,
                            request.params.attributeId,
                            request.body,
                        ),
                    );
                },
            });

            app.delete("/:id/attributes/:attributeId/values/:valueId", {
                preHandler: [fastify.requirePermission("delete", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Delete attribute value",
                    params: AttributeValueIdParamSchema,
                },
                handler: async (request, reply) => {
                    await productService.deleteAttributeValue(
                        request.params.id,
                        request.params.attributeId,
                        request.params.valueId,
                    );
                    return reply.sendOk(null, "Attribute value deleted");
                },
            });

            // ─── Specs (product-level info like Material, Warranty) ─────────
            app.get("/:id/specs", {
                preHandler: [fastify.requirePermission("read", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "List product specs",
                    params: IdParamSchema,
                },
                handler: async (request, reply) => {
                    return reply.sendOk(await productService.listSpecs(request.params.id));
                },
            });

            app.post("/:id/specs", {
                preHandler: [fastify.requirePermission("create", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Add spec",
                    params: IdParamSchema,
                    body: CreateSpecSchema,
                },
                handler: async (request, reply) => {
                    return reply.sendCreated(
                        await productService.addSpec(request.params.id, request.body),
                    );
                },
            });

            app.put("/:id/specs/:specId", {
                preHandler: [fastify.requirePermission("update", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Update spec",
                    params: SpecIdParamSchema,
                    body: UpdateSpecSchema,
                },
                handler: async (request, reply) => {
                    return reply.sendOk(
                        await productService.updateSpec(
                            request.params.id,
                            request.params.specId,
                            request.body,
                        ),
                    );
                },
            });

            app.delete("/:id/specs/:specId", {
                preHandler: [fastify.requirePermission("delete", "products")],
                schema: {
                    tags: ["Admin | Products"],
                    summary: "Delete spec",
                    params: SpecIdParamSchema,
                },
                handler: async (request, reply) => {
                    await productService.deleteSpec(request.params.id, request.params.specId);
                    return reply.sendOk(null, "Spec deleted");
                },
            });

            // ─── Delete product ────────────────────────────────────────────
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

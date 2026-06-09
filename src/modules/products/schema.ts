import { z } from "zod";
import { PaginationQuerySchema, UuidSchema } from "@/shared/types.js";

// ─── Status & Has Variants ───────────────────────────────────────────────────

export const ProductStatusSchema = z.enum(["draft", "published", "archived"]);

// ─── Dimensions & Shipping ───────────────────────────────────────────────────

export const DimensionsSchema = z
    .object({
        weight: z.coerce.number().positive().max(10000).optional(),
        length: z.coerce.number().positive().max(10000).optional(),
        width: z.coerce.number().positive().max(10000).optional(),
        height: z.coerce.number().positive().max(10000).optional(),
        freeShipping: z.coerce.boolean().default(false),
    });

// ─── Specs (product-level) ───────────────────────────────────────────────────

export const SpecSchema = z.object({
    name: z.string().min(1).max(100),
    value: z.string().min(1).max(255),
    sortOrder: z.coerce.number().int().nonnegative().default(0),
});

export const CreateSpecSchema = z.object({
    name: z.string().min(1).max(100),
    value: z.string().min(1).max(255),
    sortOrder: z.coerce.number().int().nonnegative().default(0),
});

export const UpdateSpecSchema = CreateSpecSchema.partial();

export const SpecIdParamSchema = z.object({
    id: z.string().uuid("id must be a valid UUID"),
    specId: z.string().uuid("specId must be a valid UUID"),
});

// ─── Attribute Values (variant options) ──────────────────────────────────────

const AttributeValueInputSchema = z.object({
    value: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).optional(),
    metadata: z.record(z.any()).nullable().optional(),
    sortOrder: z.coerce.number().int().nonnegative().default(0),
});

export const CreateAttributeSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).optional(),
    sortOrder: z.coerce.number().int().nonnegative().default(0),
    values: z.array(AttributeValueInputSchema).min(1, "At least one value is required"),
});

export const UpdateAttributeSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().min(1).max(100).optional(),
    sortOrder: z.coerce.number().int().nonnegative().optional(),
});

export const CreateAttributeValueSchema = z.object({
    value: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).optional(),
    metadata: z.record(z.any()).nullable().optional(),
    sortOrder: z.coerce.number().int().nonnegative().default(0),
});

export const AttributeIdParamSchema = z.object({
    id: z.string().uuid("id must be a valid UUID"),
    attributeId: z.string().uuid("attributeId must be a valid UUID"),
});

export const AttributeValueIdParamSchema = z.object({
    id: z.string().uuid("id must be a valid UUID"),
    attributeId: z.string().uuid("attributeId must be a valid UUID"),
    valueId: z.string().uuid("valueId must be a valid UUID"),
});

// ─── Variants ────────────────────────────────────────────────────────────────

export const CreateVariantSchema = z.object({
    sku: z.string().min(1).max(100),
    name: z.string().min(1).max(255),
    basePrice: z.coerce.number().positive(),
    salePrice: z.coerce.number().nonnegative().nullable().optional(),
    stock: z.coerce.number().int().nonnegative().default(0),
    isDefault: z.coerce.boolean().default(false),
    isActive: z.coerce.boolean().default(true),
    sortOrder: z.coerce.number().int().nonnegative().default(0),
    attributeValueIds: z.array(z.string().uuid()).optional(),
});

export const UpdateVariantSchema = CreateVariantSchema.partial();

export const VariantIdParamSchema = z.object({
    id: z.string().uuid("id must be a valid UUID"),
    variantId: z.string().uuid("variantId must be a valid UUID"),
});

export const SetVariantAttributesSchema = z.object({
    attributeValueIds: z
        .array(z.string().uuid())
        .min(0)
        .describe("Array of attribute value ids assigned to this variant"),
});

// ─── Images ──────────────────────────────────────────────────────────────────

export const ImageSchema = z.object({
    url: z.string().url().describe("Image URL"),
    sortOrder: z
        .number()
        .int()
        .default(0)
        .describe("Order in which the image appears"),
});

// ─── File Upload ─────────────────────────────────────────────────────────────

export const FileUploadSchema = z.object({
    filename: z.string().describe("Original filename"),
    mimetype: z.string().describe("MIME type of the file"),
    data: z.instanceof(Buffer).describe("File binary data"),
});

// ─── Product Create / Update ─────────────────────────────────────────────────

export const CreateProductBaseSchema = z
    .object({
        name: z
            .string()
            .min(1)
            .describe("Name of the product")
            .max(256, "Name can not be maximum of 256 characters"),
        description: z.string().min(4).optional().describe("Detailed product description"),
        status: ProductStatusSchema,
        hasVariants: z.coerce.boolean(),
        price: z
            .number()
            .nonnegative()
            .optional()
            .describe("Product retail price. Required (>0) when hasVariants=false; 0 is allowed when hasVariants=true."),
        costPrice: z
            .number()
            .nonnegative()
            .optional()
            .describe("Product cost price. Required (>0) when hasVariants=false; 0 is allowed when hasVariants=true."),
        discountPercentage: z
            .number()
            .min(0)
            .max(100)
            .default(0)
            .describe("Discount percentage (0-100)"),
        stock: z
            .number()
            .int()
            .nonnegative()
            .optional()
            .describe("Current inventory count. Required (>=0) when hasVariants=false; 0 is allowed when hasVariants=true."),
        categoryId: z.string().uuid("categoryId must be a valid UUID").optional().describe("Category is optional"),
        brandId: z.string().uuid("brandId must be a valid UUID").optional().describe("Brand is optional"),
        variants: z
            .array(CreateVariantSchema)
            .optional()
            .describe("Initial variants (only when hasVariants=true)"),
        specs: z
            .array(SpecSchema)
            .optional()
            .describe("Product-level specifications (e.g. Material, Warranty)"),
    })
    .merge(DimensionsSchema);

export const CreateProductSchema = CreateProductBaseSchema.refine(
    (d) => {
        if (d.hasVariants) return true;
        return d.price !== undefined && d.price > 0 && d.stock !== undefined;
    },
    {
        message:
            "price (>0) and stock are required when hasVariants is false (they seed the auto-generated default variant)",
        path: ["price"],
    },
).refine(
    (d) => d.hasVariants || (d.costPrice !== undefined && d.costPrice > 0),
    {
        message: "costPrice (>0) is required when hasVariants is false",
        path: ["costPrice"],
    },
);

export const UpdateProductSchema = CreateProductBaseSchema.partial();

// ─── Public Response Schemas ─────────────────────────────────────────────────

// Note: response shape varies based on has_variants; this is the basic shape
// the service layer returns. `enrichProduct` adds price/sale_price/stock
// mirrored from the default variant for has_variants=false products.

export const VariantResponseSchema = z.object({
    id: z.string().uuid(),
    sku: z.string(),
    name: z.string(),
    basePrice: z.string(),
    salePrice: z.string().nullable(),
    stock: z.number(),
    isDefault: z.boolean(),
    isActive: z.boolean(),
    sortOrder: z.number(),
});

export const DefaultVariantResponseSchema = z.object({
    variant_id: z.string().uuid(),
    sku: z.string(),
    base_price: z.number(),
    sale_price: z.number().nullable(),
    stock: z.number(),
});

export const ProductResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    status: z.string(),
    hasVariants: z.boolean(),
    freeShipping: z.boolean(),
    price: z.number().describe("Computed price (variant for simple, range start for variable)"),
    discountPercentage: z.number(),
    finalPrice: z.number().describe("Computed price after discount"),
    inStock: z.boolean(),
    category: z.object({ id: z.string(), name: z.string() }).nullable(),
    brand: z.object({ id: z.string(), name: z.string(), logoUrl: z.string().nullable() }).nullable(),
    images: z.array(z.object({ url: z.string(), sortOrder: z.number(), isPrimary: z.boolean() })),
    variants: z.array(VariantResponseSchema),
    defaultVariant: DefaultVariantResponseSchema.nullable(),
    priceRange: z.object({ min: z.number(), max: z.number() }).nullable(),
    attributes: z.array(z.object({ name: z.string(), value: z.string() })),
    dimensions: z.object({
        weight: z.number().nullable(),
        length: z.number().nullable(),
        width: z.number().nullable(),
        height: z.number().nullable(),
    }).nullable(),
});

// Legacy: keep `ProductSchema` exported for backward compat in some routes
export const ProductSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    price: z.string(),
    costPrice: z.string(),
    discountPercentage: z.number(),
    finalPrice: z.number().describe("Computed price after discount"),
    stock: z.number(),
    isActive: z.boolean(),
    category: z.object({ id: z.string(), name: z.string() }).nullable(),
    brand: z.object({ id: z.string(), name: z.string() }).nullable(),
    images: z.array(z.object({ url: z.string(), sortOrder: z.number() })),
});

// ─── Listing & Filters ───────────────────────────────────────────────────────

export const ProductParamsSchema = z.object({
    page: z.coerce
        .number()
        .int()
        .positive()
        .default(1)
        .describe("Page number for pagination"),
    limit: z.coerce
        .number()
        .int()
        .positive()
        .max(100)
        .default(10)
        .describe("Number of items per page"),
    search: z.string().optional().describe("Search term for product name"),
    category: z.string().optional().describe("Filter by category ID or slug"),
    brand: z.string().optional().describe("Filter by brand ID or slug"),
    minPrice: z.coerce
        .number()
        .nonnegative()
        .optional()
        .describe("Minimum price filter"),
    maxPrice: z.coerce
        .number()
        .nonnegative()
        .optional()
        .describe("Maximum price filter"),
    sort: z
        .enum(["newest", "price-low", "price-high", "popular"])
        .default("newest")
        .describe("Sorting criteria"),
    hasVariants: z
        .enum(["true", "false"])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === "true"))
        .describe("Filter by has_variants flag"),
});

export const AdminProductParamsSchema = ProductParamsSchema.extend({
    isActive: z
        .enum(["true", "false"])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === "true"))
        .describe("Legacy alias for status='published' (deprecated, use status)"),
    status: ProductStatusSchema.optional(),
});

// ─── Image Sort ──────────────────────────────────────────────────────────────

export const ImageIdParamSchema = z.object({
    id: z.string().uuid("id must be a valid UUID"),
    imageId: z.string().uuid("imageId must be a valid UUID"),
});

export type ImageIdParams = z.infer<typeof ImageIdParamSchema>;

export const SortImageItemSchema = z.object({
    imageId: z
        .string()
        .uuid("imageId must be a valid UUID")
        .describe("UUID of the product image"),
    sortOrder: z
        .number()
        .int("sortOrder must be an integer")
        .nonnegative("sortOrder cannot be negative")
        .describe("New sort position (0-based)"),
});

export const SortImagesSchema = z.object({
    images: z
        .array(SortImageItemSchema)
        .min(1, "At least one image is required")
        .max(50, "Cannot reorder more than 50 images at once")
        .describe("Array of image IDs with their new sort positions"),
});

export type SortImageItem = z.infer<typeof SortImageItemSchema>;
export type SortImages = z.infer<typeof SortImagesSchema>;

// ─── Bulk Import ─────────────────────────────────────────────────────────────

export const BulkProductRowSchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .max(256, "Name cannot exceed 256 characters"),
    description: z.string().min(4, "Description must be at least 4 characters").optional(),
    price: z.coerce.number().positive("Price must be a positive number"),
    costPrice: z.coerce
        .number()
        .positive("Cost price must be a positive number"),
    discountPercentage: z.coerce
        .number()
        .min(0, "Discount cannot be negative")
        .max(100, "Discount cannot exceed 100")
        .default(0),
    stock: z.coerce
        .number()
        .int("Stock must be an integer")
        .nonnegative("Stock cannot be negative")
        .default(0),
    status: ProductStatusSchema.default("published"),
    hasVariants: z
        .union([z.boolean(), z.string()])
        .transform((v) => (typeof v === "string" ? v.toLowerCase() === "true" : v))
        .default(false),
    freeShipping: z
        .union([z.boolean(), z.string()])
        .transform((v) => (typeof v === "string" ? v.toLowerCase() === "true" : v))
        .default(false),
    weight: z.coerce.number().positive().max(10000).optional(),
    length: z.coerce.number().positive().max(10000).optional(),
    width: z.coerce.number().positive().max(10000).optional(),
    height: z.coerce.number().positive().max(10000).optional(),
    categoryId: z.string().uuid("categoryId must be a valid UUID").optional(),
    brandId: z.string().uuid("brandId must be a valid UUID").optional(),
    images: z
        .string()
        .optional()
        .transform((v) => {
            if (!v || v.trim() === "") return undefined;
            try {
                const parsed = JSON.parse(v);
                if (!Array.isArray(parsed)) {
                    throw new Error("images must be a JSON array of URLs");
                }
                return parsed.map((url) => {
                    if (typeof url !== "string" || !z.string().url().safeParse(url).success) {
                        throw new Error("Each image must be a valid URL string");
                    }
                    return { url, sortOrder: 0 };
                });
            } catch (e) {
                if (e instanceof Error && e.message.includes("images must be")) {
                    throw e;
                }
                throw new Error(
                    "images must be a valid JSON array, e.g. [\"https://...\"]",
                );
            }
        }),
});

export const BulkImportErrorSchema = z.object({
    row: z.number().describe("1-indexed row number where the error occurred"),
    data: z.record(z.any()).describe("The raw row data that failed validation"),
    errors: z.array(z.string()).describe("List of validation error messages"),
});

export const BulkImportResponseSchema = z.object({
    totalRows: z.number().describe("Total number of data rows in the file"),
    created: z
        .number()
        .describe("Number of products successfully created before the error"),
    failedAtRow: z
        .number()
        .nullable()
        .describe("Row number where validation failed, or null on full success"),
    errors: z
        .array(z.string())
        .describe("Validation errors for the failed row (empty on success)"),
    createdProducts: z
        .array(ProductSchema)
        .optional()
        .describe("Created products (only included when import fully succeeds)"),
});

export const BULK_IMPORT_MAX_ROWS = 500;
export const BULK_IMPORT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const BULK_IMPORT_ALLOWED_MIMETYPES = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream", // Browsers sometimes send this for xlsx
];

export type BulkProductRow = z.infer<typeof BulkProductRowSchema>;
export type BulkImportError = z.infer<typeof BulkImportErrorSchema>;
export type BulkImportResponse = z.infer<typeof BulkImportResponseSchema>;

export const NewArrivalsParamsSchema = z.object({
    limit: z.coerce
        .number()
        .int()
        .positive()
        .max(50)
        .default(10)
        .describe("Number of new arrival products to return"),
});

export const IdParamSchema = z.object({
    id: z.string().uuid("id must be a valid UUID"),
});

export const SlugParamSchema = z.object({
    slug: z.string().min(1).describe("URL-friendly product slug"),
});

export const ProductLookupParamSchema = z.object({
    id: z
        .string()
        .min(1)
        .describe("Product ID (UUID) or unique slug"),
});

export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
export type ProductParams = z.infer<typeof ProductParamsSchema>;
export type AdminProductParams = z.infer<typeof AdminProductParamsSchema>;
export type NewArrivalsParams = z.infer<typeof NewArrivalsParamsSchema>;
export type Image = z.infer<typeof ImageSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type CreateVariant = z.infer<typeof CreateVariantSchema>;
export type UpdateVariant = z.infer<typeof UpdateVariantSchema>;
export type CreateSpec = z.infer<typeof CreateSpecSchema>;
export type UpdateSpec = z.infer<typeof UpdateSpecSchema>;
export type CreateAttribute = z.infer<typeof CreateAttributeSchema>;
export type UpdateAttribute = z.infer<typeof UpdateAttributeSchema>;
export type CreateAttributeValue = z.infer<typeof CreateAttributeValueSchema>;

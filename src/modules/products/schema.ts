import { z } from "zod";
import { PaginationQuerySchema } from "@/shared/types.js";

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
  category: z.string().uuid().optional().describe("Filter by category UUID"),
  brand: z.string().uuid().optional().describe("Filter by brand UUID"),
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
});

export const AdminProductParamsSchema = ProductParamsSchema.extend({
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const ImageSchema = z.object({
  url: z.string().url().describe("Image URL"),
  sortOrder: z
    .number()
    .int()
    .default(0)
    .describe("Order in which the image appears"),
});

export const FileUploadSchema = z.object({
  filename: z.string().describe("Original filename"),
  mimetype: z.string().describe("MIME type of the file"),
  data: z.instanceof(Buffer).describe("File binary data"),
});

export const CreateProductSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("Name of the product")
    .max(256, "Name can not be maximum of 256 characters"),
  slug: z.string().min(1).describe("Unique URL-friendly slug"),
  description: z.string().min(4).describe("Detailed product description"),
  price: z.number().positive().describe("Product retail price"),
  costPrice: z.number().positive().describe("Product cost price"),
  discountPercentage: z
    .number()
    .min(0)
    .max(100)
    .default(0)
    .describe("Discount percentage (0-100)"),
  stock: z.number().int().nonnegative().describe("Current inventory count"),
  isActive: z
    .boolean()
    .default(true)
    .describe("Whether the product is visible to customers"),
  categoryId: z.string({ required_error: "Category is required" }),
  brandId: z.string({ required_error: "Brand is required" }),
  images: z
    .array(ImageSchema)
    .optional()
    .describe("List of product images with URLs"),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const SlugParamSchema = z.object({
  slug: z.string().min(1).describe("URL-friendly product slug"),
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
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(4, "Description must be at least 4 characters"),
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
  isActive: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v.toLowerCase() === "true" : v))
    .default(true),
  categoryId: z.string().uuid("categoryId must be a valid UUID"),
  brandId: z.string().uuid("brandId must be a valid UUID"),
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

export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
export type ProductParams = z.infer<typeof ProductParamsSchema>;
export type AdminProductParams = z.infer<typeof AdminProductParamsSchema>;
export type Image = z.infer<typeof ImageSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;

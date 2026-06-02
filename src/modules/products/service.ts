import { eq, and, gte, lte, ilike, count, sql, desc, asc } from "drizzle-orm";
import { db } from "@/config/db.js";
import { products, productImages } from "@/db/schema/product.js";
import { categories } from "@/db/schema/category.js";
import { brands } from "@/db/schema/brand.js";
import { uploadService } from "@/shared/services/upload.js";
import { NotFoundError, BadRequestError } from "@/shared/errors.js";
import type {
  CreateProduct,
  UpdateProduct,
  ProductParams,
  AdminProductParams,
  FileUpload,
  BulkImportResponse,
} from "./schema.js";
import {
  parseImportFile,
  validateRow,
  assertRowCount,
  checkHeaders,
  REQUIRED_COLUMNS,
} from "./bulk-import.js";

export class ProductService {
  private enrichProduct(product: any) {
    if (!product) return product;
    const price = parseFloat(product.price);
    const discount = product.discountPercentage || 0;
    const finalPrice = price * (1 - discount / 100);
    return {
      ...product,
      finalPrice: Math.round(finalPrice * 100) / 100,
    };
  }

  async list(filters: ProductParams) {
    const { page, limit, category, brand, minPrice, maxPrice, search, sort } =
      filters;
    const offset = (page - 1) * limit;

    const conditions = [eq(products.isActive, true)];
    if (category) conditions.push(eq(products.categoryId, category));
    if (brand) conditions.push(eq(products.brandId, brand));
    if (minPrice !== undefined)
      conditions.push(gte(sql`CAST(${products.price} AS NUMERIC)`, minPrice));
    if (maxPrice !== undefined)
      conditions.push(lte(sql`CAST(${products.price} AS NUMERIC)`, maxPrice));
    if (search) conditions.push(ilike(products.name, `%${search}%`));

    const finalPriceExpr = sql`CAST(${products.price} AS NUMERIC) * (1 - CAST(${products.discountPercentage} AS NUMERIC) / 100)`;

    let orderBy;
    switch (sort) {
      case "price-low":
        orderBy = [asc(finalPriceExpr)];
        break;
      case "price-high":
        orderBy = [desc(finalPriceExpr)];
        break;
      case "popular":
        // For now, sorting by stock as a placeholder for popularity
        orderBy = [desc(products.stock)];
        break;
      case "newest":
      default:
        orderBy = [desc(products.createdAt)];
        break;
    }

    const [rows, totalResult] = await Promise.all([
      db.query.products.findMany({
        where: and(...conditions),
        with: {
          category: true,
          brand: true,
          images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
        },
        limit,
        offset,
        orderBy,
      }),
      db
        .select({ value: count() })
        .from(products)
        .where(and(...conditions)),
    ]);

    return {
      rows: rows.map((r) => this.enrichProduct(r)),
      total: Number(totalResult[0]?.value ?? 0),
    };
  }

  async adminList(filters: AdminProductParams) {
    const {
      page,
      limit,
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sort,
      isActive,
    } = filters;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (isActive !== undefined)
      conditions.push(eq(products.isActive, isActive));
    if (category) conditions.push(eq(products.categoryId, category));
    if (brand) conditions.push(eq(products.brandId, brand));
    if (minPrice !== undefined)
      conditions.push(gte(sql`CAST(${products.price} AS NUMERIC)`, minPrice));
    if (maxPrice !== undefined)
      conditions.push(lte(sql`CAST(${products.price} AS NUMERIC)`, maxPrice));
    if (search) conditions.push(ilike(products.name, `%${search}%`));

    const finalPriceExpr = sql`CAST(${products.price} AS NUMERIC) * (1 - CAST(${products.discountPercentage} AS NUMERIC) / 100)`;

    let orderBy;
    switch (sort) {
      case "price-low":
        orderBy = [asc(finalPriceExpr)];
        break;
      case "price-high":
        orderBy = [desc(finalPriceExpr)];
        break;
      case "popular":
        orderBy = [desc(products.stock)];
        break;
      case "newest":
      default:
        orderBy = [desc(products.createdAt)];
        break;
    }

    const [rows, totalResult] = await Promise.all([
      db.query.products.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          category: true,
          brand: true,
          images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
        },
        limit,
        offset,
        orderBy,
      }),
      db
        .select({ value: count() })
        .from(products)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    return {
      rows: rows.map((r) => this.enrichProduct(r)),
      total: Number(totalResult[0]?.value ?? 0),
    };
  }

  async getBySlug(slug: string) {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
      with: {
        category: true,
        brand: true,
        images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
        tags: { with: { tag: true } },
      },
    });
    if (!product) throw new NotFoundError("Product");
    return this.enrichProduct(product);
  }

  async create(data: CreateProduct & { imageFiles?: FileUpload[] }) {
    const { images: existingImages, imageFiles, ...productData } = data;
    const uploadedUrls: string[] = [];

    try {
      if (imageFiles && imageFiles.length > 0) {
        for (const file of imageFiles) {
          const url = await uploadService.uploadFile(
            `products/${file.filename}`,
            file.mimetype,
            file.data,
          );
          uploadedUrls.push(url);
        }
      }

      return await db.transaction(async (tx) => {
        const [product] = await tx
          .insert(products)
          .values({
            ...productData,
            price: productData.price.toString(),
            costPrice: productData.costPrice.toString(),
            discountPercentage: productData.discountPercentage,
          })
          .returning();

        if (!product) throw new Error("Product creation failed");

        const allImages = [
          ...(existingImages || []).map((img) => ({
            url: img.url,
            sortOrder: img.sortOrder,
          })),
          ...uploadedUrls.map((url, index) => ({
            url,
            sortOrder: (existingImages?.length || 0) + index,
          })),
        ];

        if (allImages.length > 0) {
          await tx.insert(productImages).values(
            allImages.map((img) => ({
              productId: product.id,
              url: img.url,
              sortOrder: img.sortOrder,
            })),
          );
        }

        const result = await tx.query.products.findFirst({
          where: eq(products.id, product.id),
          with: {
            category: true,
            brand: true,
            images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
          },
        });

        if (!result) throw new Error("Product retrieval failed");
        return this.enrichProduct(result);
      });
    } catch (error) {
      for (const url of uploadedUrls) {
        const key = url.split("/").pop();
        if (key) await uploadService.deleteFile(`products/${key}`).catch(console.error);
      }
      throw error;
    }
  }

  async update(id: string, data: UpdateProduct & { imageFiles?: FileUpload[] }) {
    const { images: existingImages, imageFiles, ...productData } = data;
    const uploadedUrls: string[] = [];

    try {
      if (imageFiles && imageFiles.length > 0) {
        for (const file of imageFiles) {
          const url = await uploadService.uploadFile(
            `products/${file.filename}`,
            file.mimetype,
            file.data,
          );
          uploadedUrls.push(url);
        }
      }

      return await db.transaction(async (tx) => {
        const [product] = await tx
          .update(products)
          .set({
            ...productData,
            price: productData.price?.toString(),
            costPrice: productData.costPrice?.toString(),
            discountPercentage: productData.discountPercentage,
            updatedAt: new Date(),
          })
          .where(eq(products.id, id))
          .returning();

        if (!product) throw new NotFoundError("Product");

        if (existingImages || uploadedUrls.length > 0) {
          await tx.delete(productImages).where(eq(productImages.productId, id));

          const allImages = [
            ...(existingImages || []).map((img) => ({
              url: img.url,
              sortOrder: img.sortOrder,
            })),
            ...uploadedUrls.map((url, index) => ({
              url,
              sortOrder: (existingImages?.length || 0) + index,
            })),
          ];

          if (allImages.length > 0) {
            await tx.insert(productImages).values(
              allImages.map((img) => ({
                productId: id,
                url: img.url,
                sortOrder: img.sortOrder,
              })),
            );
          }
        }

        const result = await tx.query.products.findFirst({
          where: eq(products.id, id),
          with: {
            category: true,
            brand: true,
            images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
          },
        });
        if (!result) throw new Error("Product retrieval failed");
        return this.enrichProduct(result);
      });
    } catch (error) {
      for (const url of uploadedUrls) {
        const key = url.split("/").pop();
        if (key) await uploadService.deleteFile(`products/${key}`).catch(console.error);
      }
      throw error;
    }
  }

  async delete(id: string) {
    const [product] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();
    if (!product) throw new NotFoundError("Product");
    return product;
  }

  async getById(id: string) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        category: true,
        brand: true,
        images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
      },
    });
    return this.enrichProduct(product);
  }

  // ─── Image Sort ─────────────────────────────────────────────────────────────

  async reorderImages(
    productId: string,
    items: { imageId: string; sortOrder: number }[],
  ) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: {
        images: true,
      },
    });
    if (!product) throw new NotFoundError("Product");

    const existingIds = new Set(product.images.map((i) => i.id));
    for (const item of items) {
      if (!existingIds.has(item.imageId)) {
        throw new BadRequestError(
          `Image ${item.imageId} does not belong to this product`,
        );
      }
    }

    return await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(productImages)
          .set({ sortOrder: item.sortOrder })
          .where(eq(productImages.id, item.imageId));
      }

      const updated = await tx.query.productImages.findMany({
        where: eq(productImages.productId, productId),
        orderBy: (i, { asc }) => [asc(i.sortOrder)],
      });
      return updated;
    });
  }

  // ─── Image Upload ─────────────────────────────────────────────────────────

  async uploadImages(productId: string, imageFiles: FileUpload[]) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: {
        images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
      },
    });
    if (!product) throw new NotFoundError("Product");

    const uploadedUrls: string[] = [];
    try {
      for (const file of imageFiles) {
        const url = await uploadService.uploadFile(
          `products/${file.filename}`,
          file.mimetype,
          file.data,
        );
        uploadedUrls.push(url);
      }

      const nextSortOrder = product.images.length > 0
        ? product.images[product.images.length - 1]!.sortOrder + 1
        : 0;

      const newImageRows = uploadedUrls.map((url, i) => ({
        productId,
        url,
        sortOrder: nextSortOrder + i,
      }));

      await db.insert(productImages).values(newImageRows);

      const updated = await db.query.productImages.findMany({
        where: eq(productImages.productId, productId),
        orderBy: (i, { asc }) => [asc(i.sortOrder)],
      });
      return updated;
    } catch (error) {
      for (const url of uploadedUrls) {
        const key = url.split("/").pop();
        if (key) await uploadService.deleteFile(`products/${key}`).catch(console.error);
      }
      throw error;
    }
  }

  // ─── Image Delete ──────────────────────────────────────────────────────────

  async deleteImage(productId: string, imageId: string) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    if (!product) throw new NotFoundError("Product");

    const image = await db.query.productImages.findFirst({
      where: eq(productImages.id, imageId),
    });
    if (!image) throw new NotFoundError("Product image");
    if (image.productId !== productId) {
      throw new BadRequestError("Image does not belong to this product");
    }

    await db.delete(productImages).where(eq(productImages.id, imageId));

    // Attempt R2 cleanup if image was uploaded
    if (image.url.includes("r2.dev")) {
      const key = image.url.split("/").pop();
      if (key) uploadService.deleteFile(`products/${key}`).catch(() => {});
    }

    const remaining = await db.query.productImages.findMany({
      where: eq(productImages.productId, productId),
      orderBy: (i, { asc }) => [asc(i.sortOrder)],
    });
    return remaining;
  }

  // ─── Bulk Import ────────────────────────────────────────────────────────────

  async bulkImport(
    buffer: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<BulkImportResponse> {
    let parsed;
    try {
      parsed = parseImportFile(buffer, filename, mimetype);
    } catch (e) {
      throw new BadRequestError(
        e instanceof Error ? e.message : "Failed to parse file",
      );
    }

    try {
      checkHeaders(parsed.rows);
    } catch (e) {
      throw new BadRequestError(
        e instanceof Error ? e.message : "Invalid file headers",
      );
    }

    assertRowCount(parsed.rows);

    const createdProducts: any[] = [];
    let created = 0;

    for (let i = 0; i < parsed.rows.length; i++) {
      const rowNumber = i + 2;
      const rawRow = parsed.rows[i];

      const validation = validateRow(rawRow, rowNumber);
      if (!validation.ok) {
        return {
          totalRows: parsed.totalRows,
          created,
          failedAtRow: rowNumber,
          errors: validation.errors,
          createdProducts: [],
        };
      }

      const data = validation.data;

      const category = await db.query.categories.findFirst({
        where: eq(categories.id, data.categoryId),
      });
      if (!category) {
        return {
          totalRows: parsed.totalRows,
          created,
          failedAtRow: rowNumber,
          errors: [`categoryId: Category not found for id ${data.categoryId}`],
          createdProducts: [],
        };
      }

      const brand = await db.query.brands.findFirst({
        where: eq(brands.id, data.brandId),
      });
      if (!brand) {
        return {
          totalRows: parsed.totalRows,
          created,
          failedAtRow: rowNumber,
          errors: [`brandId: Brand not found for id ${data.brandId}`],
          createdProducts: [],
        };
      }

      const existing = await db.query.products.findFirst({
        where: eq(products.slug, data.slug),
      });
      if (existing) {
        return {
          totalRows: parsed.totalRows,
          created,
          failedAtRow: rowNumber,
          errors: [`slug: Product with slug "${data.slug}" already exists`],
          createdProducts: [],
        };
      }

      try {
        const created2 = await this.create({
          name: data.name,
          slug: data.slug,
          description: data.description,
          price: data.price,
          costPrice: data.costPrice,
          discountPercentage: data.discountPercentage,
          stock: data.stock,
          isActive: data.isActive,
          categoryId: data.categoryId,
          brandId: data.brandId,
          images: data.images ?? [],
        });
        createdProducts.push(created2);
        created += 1;
      } catch (e) {
        return {
          totalRows: parsed.totalRows,
          created,
          failedAtRow: rowNumber,
          errors: [
            e instanceof Error
              ? `Database error: ${e.message}`
              : "Database error while creating product",
          ],
          createdProducts: [],
        };
      }
    }

    return {
      totalRows: parsed.totalRows,
      created,
      failedAtRow: null,
      errors: [],
      createdProducts,
    };
  }

  async getImportTemplate(format: "csv" | "xlsx"): Promise<{
    filename: string;
    contentType: string;
    buffer: Buffer;
  }> {
    const sampleRow: Record<string, string> = {
      name: "Sample Product Name",
      slug: "sample-product-slug",
      description: "Detailed product description (min 4 characters)",
      price: "1999.99",
      costPrice: "1200.00",
      discountPercentage: "10",
      stock: "50",
      isActive: "true",
      categoryId: "00000000-0000-0000-0000-000000000000",
      brandId: "00000000-0000-0000-0000-000000000000",
      images: '["https://example.com/image1.jpg","https://example.com/image2.jpg"]',
    };

    const headers: string[] = [
      ...REQUIRED_COLUMNS,
      "discountPercentage",
      "stock",
      "isActive",
      "images",
    ];
    const headerRow = headers.join(",");
    const rowValues = headers.map((h) => sampleRow[h] ?? "").join(",");

    if (format === "csv") {
      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const rowCsv = headers
        .map((h) => escape(String(sampleRow[h] ?? "")))
        .join(",");
      const content = `${headerRow}\n${rowCsv}\n`;
      return {
        filename: "products-bulk-import-template.csv",
        contentType: "text/csv",
        buffer: Buffer.from(content, "utf-8"),
      };
    }

    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      headers.map((h) => sampleRow[h] ?? ""),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return {
      filename: "products-bulk-import-template.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: buffer as Buffer,
    };
  }
}

export const productService = new ProductService();

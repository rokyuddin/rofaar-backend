import { eq, and, gte, lte, ilike, count, sql, desc, asc } from "drizzle-orm";
import { db } from "@/config/db.js";
import { products, productImages } from "@/db/schema/product.js";
import { uploadService } from "@/shared/services/upload.js";
import { NotFoundError } from "@/shared/errors.js";
import type {
  CreateProduct,
  UpdateProduct,
  ProductParams,
  AdminProductParams,
  FileUpload,
} from "./schema.js";

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
            file.filename,
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
        if (key) await uploadService.deleteFile(key).catch(console.error);
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
            file.filename,
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
        if (key) await uploadService.deleteFile(key).catch(console.error);
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
}

export const productService = new ProductService();

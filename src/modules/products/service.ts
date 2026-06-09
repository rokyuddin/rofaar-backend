import { eq, and, gte, lte, ilike, count, sql, desc, asc } from "drizzle-orm";
import { db } from "@/config/db.js";
import {
    products,
    productImages,
} from "@/db/schema/product.js";
import {
    productVariants,
    productSpecs,
    productAttributes,
    productAttributeValues,
    productVariantAttributes,
} from "@/db/schema/productVariant.js";
import { categories } from "@/db/schema/category.js";
import { brands } from "@/db/schema/brand.js";
import { uploadService } from "@/shared/services/upload.js";
import {
    NotFoundError,
    BadRequestError,
    ConflictError,
} from "@/shared/errors.js";
import { UuidSchema } from "@/shared/types.js";
import type {
    CreateProduct,
    UpdateProduct,
    ProductParams,
    AdminProductParams,
    NewArrivalsParams,
    FileUpload,
    BulkImportResponse,
    CreateVariant,
    UpdateVariant,
    CreateSpec,
    UpdateSpec,
    CreateAttribute,
    UpdateAttribute,
    CreateAttributeValue,
} from "./schema.js";
import {
    parseImportFile,
    validateRow,
    assertRowCount,
    checkHeaders,
    REQUIRED_COLUMNS,
} from "./bulk-import.js";

export class ProductService {
    // ─── Enrichment (response shaping) ──────────────────────────────────────

    /**
     * Build the public product response shape per the API contract:
     *  - has_variants=false: include `default_variant` (object), mirror
     *    price/stock from the auto variant
     *  - has_variants=true:  include `default_variant_id` + `price_range` +
     *    full `variants[]` array
     */
    private async buildProductResponse(product: any) {
        if (!product) return product;

        const discount = product.discountPercentage || 0;
        const variants = product.variants ?? [];

        // Sort variants: default first, then by sortOrder then by createdAt
        const sortedVariants = [...variants].sort((a, b) => {
            if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        // Hydrate attribute values per variant (for variant option attributes)
        const variantIds = sortedVariants.map((v: any) => v.id);
        const variantAttrs = variantIds.length
            ? await db
                  .select({
                      variantId: productVariantAttributes.variantId,
                      valueId: productAttributeValues.id,
                      value: productAttributeValues.value,
                      attributeName: productAttributes.name,
                      attributeSlug: productAttributes.slug,
                      metadata: productAttributeValues.metadata,
                  })
                  .from(productVariantAttributes)
                  .innerJoin(
                      productAttributeValues,
                      eq(productAttributeValues.id, productVariantAttributes.attributeValueId),
                  )
                  .innerJoin(
                      productAttributes,
                      eq(productAttributes.id, productAttributeValues.attributeId),
                  )
                  .where(
                      sql`${productVariantAttributes.variantId} IN ${variantIds}`,
                  )
            : [];

        const attrsByVariant = new Map<string, Array<{ name: string; value: string; [k: string]: any }>>();
        for (const row of variantAttrs) {
            const list = attrsByVariant.get(row.variantId) ?? [];
            list.push({
                name: row.attributeName,
                value: row.value,
                ...(row.metadata && typeof row.metadata === "object" ? row.metadata : {}),
            });
            attrsByVariant.set(row.variantId, list);
        }

        // Hydrate product-level specs
        const specsList = product.specs
            ? [...product.specs].sort(
                  (a: any, b: any) => a.sortOrder - b.sortOrder,
              )
            : ((await db.query.productSpecs.findMany({
                  where: eq(productSpecs.productId, product.id),
                  orderBy: [asc(productSpecs.sortOrder)],
              })) as any[]) ?? [];

        const attributes = specsList.map((s: any) => ({
            name: s.name,
            value: s.value,
        }));

        // Build images with isPrimary flag (first image by sortOrder)
        const sortedImages = (product.images ?? [])
            .slice()
            .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
            .map((img: any, idx: number) => ({
                url: img.url,
                sortOrder: img.sortOrder,
                isPrimary: idx === 0,
            }));

        const dimensions = {
            weight: product.weight ? Number(product.weight) : null,
            length: product.length ? Number(product.length) : null,
            width: product.width ? Number(product.width) : null,
            height: product.height ? Number(product.height) : null,
        };

        const finalPrice = (price: number) =>
            Math.round(price * (1 - discount / 100) * 100) / 100;

        const serializeVariant = (v: any) => {
            const base = Number(v.basePrice);
            const sale = v.salePrice ? Number(v.salePrice) : null;
            const effective = sale ?? base;
            return {
                id: v.id,
                sku: v.sku,
                name: v.name,
                basePrice: v.basePrice,
                salePrice: v.salePrice,
                stock: v.stock,
                isDefault: v.isDefault,
                isActive: v.isActive,
                isLocked: v.isLocked,
                sortOrder: v.sortOrder,
                effectivePrice: effective,
                finalPrice: finalPrice(effective),
                inStock: v.stock > 0 && v.isActive,
                attributes: attrsByVariant.get(v.id) ?? [],
            };
        };

        const serializedVariants = sortedVariants.map(serializeVariant);
        const defaultVariant = sortedVariants.find((v: any) => v.isDefault);

        if (!product.hasVariants && defaultVariant) {
            // Simple product shape
            const base = Number(defaultVariant.basePrice);
            const sale = defaultVariant.salePrice ? Number(defaultVariant.salePrice) : null;
            const effective = sale ?? base;
            return {
                ...product,
                price: effective,
                salePrice: sale,
                stock: defaultVariant.stock,
                inStock: defaultVariant.stock > 0 && defaultVariant.isActive,
                finalPrice: finalPrice(effective),
                discountPercentage: discount,
                freeShipping: product.freeShipping,
                dimensions,
                defaultVariant: {
                    variant_id: defaultVariant.id,
                    sku: defaultVariant.sku,
                    base_price: base,
                    sale_price: sale,
                    stock: defaultVariant.stock,
                },
                variants: [],
                priceRange: null,
                attributes,
                images: sortedImages,
            };
        }

        // Variable product shape
        const effectivePrices = serializedVariants.map((v) => v.effectivePrice);
        const minPrice = effectivePrices.length ? Math.min(...effectivePrices) : 0;
        const maxPrice = effectivePrices.length ? Math.max(...effectivePrices) : 0;
        return {
            ...product,
            price: minPrice,
            stock: effectivePrices.length ? serializedVariants.reduce((s, v) => s + v.stock, 0) : 0,
            inStock: serializedVariants.some((v) => v.inStock),
            finalPrice: finalPrice(minPrice),
            discountPercentage: discount,
            freeShipping: product.freeShipping,
            dimensions,
            defaultVariantId: defaultVariant?.id ?? null,
            variants: serializedVariants,
            priceRange: { min: minPrice, max: maxPrice },
            defaultVariant: null,
            attributes,
            images: sortedImages,
        };
    }

    // ─── Public listings ───────────────────────────────────────────────────

    async list(filters: ProductParams) {
        const { page, limit, category, brand, minPrice, maxPrice, search, sort, hasVariants } =
            filters;
        const offset = (page - 1) * limit;

        const conditions = [eq(products.status, "published")];

        if (category) {
            const uuidResult = UuidSchema.safeParse(category);
            if (uuidResult.success) {
                conditions.push(eq(products.categoryId, category));
            } else {
                const catId = await this.resolveEntitySlug(categories, category);
                if (catId) {
                    conditions.push(eq(products.categoryId, catId));
                } else {
                    conditions.push(eq(products.id, "00000000-0000-0000-0000-000000000000"));
                }
            }
        }

        if (brand) {
            const uuidResult = UuidSchema.safeParse(brand);
            if (uuidResult.success) {
                conditions.push(eq(products.brandId, brand));
            } else {
                const brandId = await this.resolveEntitySlug(brands, brand);
                if (brandId) {
                    conditions.push(eq(products.brandId, brandId));
                } else {
                    conditions.push(eq(products.id, "00000000-0000-0000-0000-000000000000"));
                }
            }
        }

        if (hasVariants !== undefined) {
            conditions.push(eq(products.hasVariants, hasVariants));
        }

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
                where: and(...conditions),
                with: {
                    category: true,
                    brand: true,
                    images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
                    variants: { orderBy: (v, { asc }) => [asc(v.sortOrder)] },
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

        const enriched = await Promise.all(rows.map((r) => this.buildProductResponse(r)));
        return {
            rows: enriched,
            total: Number(totalResult[0]?.value ?? 0),
        };
    }

    async getNewArrivals(filters: NewArrivalsParams) {
        const { limit } = filters;

        const rows = await db.query.products.findMany({
            where: eq(products.status, "published"),
            with: {
                category: true,
                brand: true,
                images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
                variants: { orderBy: (v, { asc }) => [asc(v.sortOrder)] },
            },
            limit,
            orderBy: [desc(products.createdAt)],
        });

        return Promise.all(rows.map((r) => this.buildProductResponse(r)));
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
            status,
            hasVariants,
        } = filters;
        const offset = (page - 1) * limit;

        const conditions = [];
        if (status) conditions.push(eq(products.status, status));
        if (hasVariants !== undefined) conditions.push(eq(products.hasVariants, hasVariants));

        if (category) {
            const uuidResult = UuidSchema.safeParse(category);
            if (uuidResult.success) {
                conditions.push(eq(products.categoryId, category));
            } else {
                const catId = await this.resolveEntitySlug(categories, category);
                if (catId) {
                    conditions.push(eq(products.categoryId, catId));
                } else {
                    conditions.push(eq(products.id, "00000000-0000-0000-0000-000000000000"));
                }
            }
        }

        if (brand) {
            const uuidResult = UuidSchema.safeParse(brand);
            if (uuidResult.success) {
                conditions.push(eq(products.brandId, brand));
            } else {
                const brandId = await this.resolveEntitySlug(brands, brand);
                if (brandId) {
                    conditions.push(eq(products.brandId, brandId));
                } else {
                    conditions.push(eq(products.id, "00000000-0000-0000-0000-000000000000"));
                }
            }
        }

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
                    variants: { orderBy: (v, { asc }) => [asc(v.sortOrder)] },
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

        const enriched = await Promise.all(rows.map((r) => this.buildProductResponse(r)));
        return {
            rows: enriched,
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
                variants: { orderBy: (v, { asc }) => [asc(v.sortOrder)] },
                specs: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
            },
        });
        if (!product) throw new NotFoundError("Product");
        return this.buildProductResponse(product);
    }

    async getById(id: string) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, id),
            with: {
                category: true,
                brand: true,
                images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
                variants: { orderBy: (v, { asc }) => [asc(v.sortOrder)] },
                specs: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
            },
        });
        if (!product) throw new NotFoundError("Product");
        return this.buildProductResponse(product);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    private async resolveEntitySlug(
        table: typeof categories | typeof brands,
        slug: string,
    ): Promise<string | null> {
        const [row] = await db
            .select({ id: table.id })
            .from(table)
            .where(eq(table.slug, slug))
            .limit(1);
        return row?.id ?? null;
    }

    // ─── Create / Update ───────────────────────────────────────────────────

    async create(data: CreateProduct & { imageFiles?: FileUpload[] }) {
        const {
            images: existingImages,
            imageFiles,
            variants: variantsInput,
            specs: specsInput,
            ...productData
        } = data;
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
                const insertValues: any = {
                    name: productData.name,
                    slug: productData.slug,
                    description: productData.description,
                    price: (productData.price ?? 0).toString(),
                    costPrice: (productData.costPrice ?? 0).toString(),
                    discountPercentage: productData.discountPercentage,
                    stock: productData.stock ?? 0,
                    status: productData.status,
                    hasVariants: productData.hasVariants,
                    freeShipping: productData.freeShipping,
                    categoryId: productData.categoryId,
                    brandId: productData.brandId,
                };
                if (productData.weight !== undefined)
                    insertValues.weight = productData.weight.toString();
                if (productData.length !== undefined)
                    insertValues.length = productData.length.toString();
                if (productData.width !== undefined)
                    insertValues.width = productData.width.toString();
                if (productData.height !== undefined)
                    insertValues.height = productData.height.toString();

                const [product] = await tx
                    .insert(products)
                    .values(insertValues)
                    .returning();

                if (!product) throw new Error("Product creation failed");

                // ── Auto-generate default variant for has_variants=false
                if (!product.hasVariants) {
                    await tx.insert(productVariants).values({
                        productId: product.id,
                        sku: `${product.slug}-DEFAULT`,
                        name: "Default",
                        basePrice: (productData.price ?? 0).toString(),
                        salePrice: null,
                        stock: productData.stock ?? 0,
                        isDefault: true,
                        isActive: true,
                        isLocked: true,
                        sortOrder: 0,
                    });
                } else if (variantsInput && variantsInput.length > 0) {
                    // ── Insert provided variants, enforce single isDefault
                    let anyDefault = false;
                    for (const v of variantsInput) {
                        if (v.isDefault) {
                            if (anyDefault) {
                                throw new BadRequestError(
                                    "Only one variant can be marked as default",
                                );
                            }
                            anyDefault = true;
                        }
                    }
                    // Auto-promote first variant to default if none flagged
                    if (!anyDefault) {
                        variantsInput[0]!.isDefault = true;
                    }

                    for (const v of variantsInput) {
                        const skuExists = await tx.query.productVariants.findFirst({
                            where: eq(productVariants.sku, v.sku),
                        });
                        if (skuExists) {
                            throw new ConflictError(
                                `Variant with SKU "${v.sku}" already exists`,
                            );
                        }
                        await tx.insert(productVariants).values({
                            productId: product.id,
                            sku: v.sku,
                            name: v.name,
                            basePrice: v.basePrice.toString(),
                            salePrice: v.salePrice ? v.salePrice.toString() : null,
                            stock: v.stock,
                            isDefault: !!v.isDefault,
                            isActive: v.isActive ?? true,
                            isLocked: false,
                            sortOrder: v.sortOrder ?? 0,
                        });
                    }
                } else {
                    // has_variants=true but no variants provided — that's a
                    // configuration error: customer cannot add to cart.
                    // We allow it (admin can add variants later) but log a
                    // soft warning via the response.
                }

                // ── Insert specs
                if (specsInput && specsInput.length > 0) {
                    for (const s of specsInput) {
                        await tx
                            .insert(productSpecs)
                            .values({
                                productId: product.id,
                                name: s.name,
                                value: s.value,
                                sortOrder: s.sortOrder ?? 0,
                            })
                            .catch(() => {
                                // Ignore unique constraint violations on (product, name)
                            });
                    }
                }

                // ── Insert images
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
                        variants: { orderBy: (v, { asc }) => [asc(v.sortOrder)] },
                        specs: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
                    },
                });

                if (!result) throw new Error("Product retrieval failed");
                return this.buildProductResponse(result);
            });
        } catch (error) {
            for (const url of uploadedUrls) {
                const key = url.split("/").pop();
                if (key)
                    await uploadService
                        .deleteFile(`products/${key}`)
                        .catch(console.error);
            }
            throw error;
        }
    }

    async update(id: string, data: UpdateProduct & { imageFiles?: FileUpload[] }) {
        const {
            images: existingImages,
            imageFiles,
            variants: _variantsInput,
            specs: _specsInput,
            ...productData
        } = data;
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
                const existing = await tx.query.products.findFirst({
                    where: eq(products.id, id),
                    with: { variants: true },
                });
                if (!existing) throw new NotFoundError("Product");

                const updateValues: any = { updatedAt: new Date() };
                if (productData.name !== undefined) updateValues.name = productData.name;
                if (productData.slug !== undefined) updateValues.slug = productData.slug;
                if (productData.description !== undefined)
                    updateValues.description = productData.description;
                if (productData.price !== undefined)
                    updateValues.price = productData.price.toString();
                if (productData.costPrice !== undefined)
                    updateValues.costPrice = productData.costPrice.toString();
                if (productData.discountPercentage !== undefined)
                    updateValues.discountPercentage = productData.discountPercentage;
                if (productData.stock !== undefined) updateValues.stock = productData.stock;
                if (productData.status !== undefined) updateValues.status = productData.status;
                if (productData.hasVariants !== undefined)
                    updateValues.hasVariants = productData.hasVariants;
                if (productData.freeShipping !== undefined)
                    updateValues.freeShipping = productData.freeShipping;
                if (productData.categoryId !== undefined)
                    updateValues.categoryId = productData.categoryId;
                if (productData.brandId !== undefined)
                    updateValues.brandId = productData.brandId;
                if (productData.weight !== undefined)
                    updateValues.weight = productData.weight.toString();
                if (productData.length !== undefined)
                    updateValues.length = productData.length.toString();
                if (productData.width !== undefined)
                    updateValues.width = productData.width.toString();
                if (productData.height !== undefined)
                    updateValues.height = productData.height.toString();

                const [product] = await tx
                    .update(products)
                    .set(updateValues)
                    .where(eq(products.id, id))
                    .returning();

                if (!product) throw new NotFoundError("Product");

                // ── Sync the auto-variant for has_variants=false products
                if (!product.hasVariants) {
                    const defaultVariant = existing.variants.find((v) => v.isDefault);
                    const syncValues: any = { updatedAt: new Date() };
                    if (productData.price !== undefined)
                        syncValues.basePrice = productData.price.toString();
                    if (productData.stock !== undefined)
                        syncValues.stock = productData.stock;
                    if (defaultVariant) {
                        await tx
                            .update(productVariants)
                            .set(syncValues)
                            .where(eq(productVariants.id, defaultVariant.id));
                    } else {
                        // Edge case: no default variant exists, create one
                        await tx.insert(productVariants).values({
                            productId: product.id,
                            sku: `${product.slug}-DEFAULT`,
                            name: "Default",
                            basePrice: productData.price?.toString() ?? product.price,
                            salePrice: null,
                            stock: productData.stock ?? product.stock,
                            isDefault: true,
                            isActive: true,
                            isLocked: true,
                            sortOrder: 0,
                        });
                    }
                }

                if (existingImages || uploadedUrls.length > 0) {
                    await tx.delete(productImages).where(eq(productImages.productId, id));

                    const allImages: Array<{ url: string; sortOrder: number }> = [
                        ...(existingImages || []).map((img: any) => ({
                            url: img.url as string,
                            sortOrder: (img.sortOrder as number) ?? 0,
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
                        variants: { orderBy: (v, { asc }) => [asc(v.sortOrder)] },
                        specs: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
                    },
                });
                if (!result) throw new Error("Product retrieval failed");
                return this.buildProductResponse(result);
            });
        } catch (error) {
            for (const url of uploadedUrls) {
                const key = url.split("/").pop();
                if (key)
                    await uploadService
                        .deleteFile(`products/${key}`)
                        .catch(console.error);
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

    // ─── Variants ──────────────────────────────────────────────────────────

    async listVariants(productId: string) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
        });
        if (!product) throw new NotFoundError("Product");

        return db.query.productVariants.findMany({
            where: eq(productVariants.productId, productId),
            orderBy: [
                desc(productVariants.isDefault),
                asc(productVariants.sortOrder),
            ],
        });
    }

    async getVariant(productId: string, variantId: string) {
        const variant = await db.query.productVariants.findFirst({
            where: and(
                eq(productVariants.id, variantId),
                eq(productVariants.productId, productId),
            ),
        });
        if (!variant) throw new NotFoundError("Variant");
        return variant;
    }

    async addVariant(productId: string, data: CreateVariant) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
            with: { variants: true },
        });
        if (!product) throw new NotFoundError("Product");
        if (product.hasVariants === false) {
            throw new BadRequestError(
                "Cannot add a variant to a product that does not use variants. Set hasVariants=true first.",
            );
        }

        // SKU uniqueness
        const dup = await db.query.productVariants.findFirst({
            where: eq(productVariants.sku, data.sku),
        });
        if (dup) throw new ConflictError(`Variant with SKU "${data.sku}" already exists`);

        return await db.transaction(async (tx) => {
            // Enforce single is_default
            if (data.isDefault) {
                await tx
                    .update(productVariants)
                    .set({ isDefault: false })
                    .where(eq(productVariants.productId, productId));
            } else if (product.variants.length === 0) {
                // First variant for this product — auto-promote to default
                data.isDefault = true;
            }

            const [variant] = await tx
                .insert(productVariants)
                .values({
                    productId,
                    sku: data.sku,
                    name: data.name,
                    basePrice: data.basePrice.toString(),
                    salePrice: data.salePrice ? data.salePrice.toString() : null,
                    stock: data.stock,
                    isDefault: !!data.isDefault,
                    isActive: data.isActive ?? true,
                    isLocked: false,
                    sortOrder: data.sortOrder ?? 0,
                })
                .returning();

            if (!variant) throw new Error("Variant creation failed");

            // Attach attribute values if provided
            if (data.attributeValueIds && data.attributeValueIds.length > 0) {
                await tx.insert(productVariantAttributes).values(
                    data.attributeValueIds.map((vid) => ({
                        variantId: variant.id,
                        attributeValueId: vid,
                    })),
                );
            }

            // Mark product as has_variants=true (in case admin flipped it)
            await tx
                .update(products)
                .set({ hasVariants: true, updatedAt: new Date() })
                .where(eq(products.id, productId));

            return variant;
        });
    }

    async updateVariant(productId: string, variantId: string, data: UpdateVariant) {
        const variant = await this.getVariant(productId, variantId);
        if (variant.isLocked) {
            throw new BadRequestError(
                "This variant is locked (auto-generated for has_variants=false). Edit the product instead.",
            );
        }

        return await db.transaction(async (tx) => {
            // SKU uniqueness (if changed)
            if (data.sku && data.sku !== variant.sku) {
                const dup = await tx.query.productVariants.findFirst({
                    where: eq(productVariants.sku, data.sku),
                });
                if (dup && dup.id !== variantId) {
                    throw new ConflictError(`Variant with SKU "${data.sku}" already exists`);
                }
            }

            if (data.isDefault === true) {
                await tx
                    .update(productVariants)
                    .set({ isDefault: false })
                    .where(eq(productVariants.productId, productId));
            }

            const updateValues: any = { updatedAt: new Date() };
            if (data.sku !== undefined) updateValues.sku = data.sku;
            if (data.name !== undefined) updateValues.name = data.name;
            if (data.basePrice !== undefined)
                updateValues.basePrice = data.basePrice.toString();
            if (data.salePrice !== undefined)
                updateValues.salePrice = data.salePrice ? data.salePrice.toString() : null;
            if (data.stock !== undefined) updateValues.stock = data.stock;
            if (data.isDefault !== undefined) updateValues.isDefault = data.isDefault;
            if (data.isActive !== undefined) updateValues.isActive = data.isActive;
            if (data.sortOrder !== undefined) updateValues.sortOrder = data.sortOrder;

            const [updated] = await tx
                .update(productVariants)
                .set(updateValues)
                .where(eq(productVariants.id, variantId))
                .returning();
            return updated!;
        });
    }

    async deleteVariant(productId: string, variantId: string) {
        const variant = await this.getVariant(productId, variantId);
        if (variant.isLocked) {
            throw new BadRequestError(
                "Cannot delete the locked default variant of a has_variants=false product.",
            );
        }
        // Don't allow deletion if this is the only/default variant
        if (variant.isDefault) {
            throw new BadRequestError(
                "Cannot delete the default variant. Promote another variant to default first.",
            );
        }
        const [deleted] = await db
            .delete(productVariants)
            .where(eq(productVariants.id, variantId))
            .returning();
        if (!deleted) throw new NotFoundError("Variant");
        return deleted;
    }

    async setVariantAttributes(
        productId: string,
        variantId: string,
        attributeValueIds: string[],
    ) {
        const variant = await this.getVariant(productId, variantId);
        if (variant.isLocked) {
            throw new BadRequestError("Cannot modify attributes of a locked variant.");
        }
        return await db.transaction(async (tx) => {
            await tx
                .delete(productVariantAttributes)
                .where(eq(productVariantAttributes.variantId, variantId));
            if (attributeValueIds.length > 0) {
                await tx.insert(productVariantAttributes).values(
                    attributeValueIds.map((vid) => ({
                        variantId,
                        attributeValueId: vid,
                    })),
                );
            }
            return { variantId, attributeValueIds };
        });
    }

    // ─── Attributes (variant options) ─────────────────────────────────────

    async listAttributes(productId: string) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
        });
        if (!product) throw new NotFoundError("Product");

        return db.query.productAttributes.findMany({
            where: eq(productAttributes.productId, productId),
            with: {
                values: { orderBy: [asc(productAttributeValues.sortOrder)] },
            },
            orderBy: [asc(productAttributes.sortOrder)],
        });
    }

    async addAttribute(productId: string, data: CreateAttribute) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
        });
        if (!product) throw new NotFoundError("Product");

        const slug = data.slug ?? slugify(data.name);

        return await db.transaction(async (tx) => {
            const [attr] = await tx
                .insert(productAttributes)
                .values({
                    productId,
                    name: data.name,
                    slug,
                    sortOrder: data.sortOrder ?? 0,
                })
                .returning();
            if (!attr) throw new Error("Attribute creation failed");

            for (const v of data.values) {
                await tx.insert(productAttributeValues).values({
                    attributeId: attr.id,
                    value: v.value,
                    slug: v.slug ?? slugify(v.value),
                    metadata: v.metadata ?? null,
                    sortOrder: v.sortOrder ?? 0,
                });
            }

            return tx.query.productAttributes.findFirst({
                where: eq(productAttributes.id, attr.id),
                with: { values: { orderBy: [asc(productAttributeValues.sortOrder)] } },
            });
        });
    }

    async updateAttribute(
        productId: string,
        attributeId: string,
        data: UpdateAttribute,
    ) {
        const attr = await db.query.productAttributes.findFirst({
            where: and(
                eq(productAttributes.id, attributeId),
                eq(productAttributes.productId, productId),
            ),
        });
        if (!attr) throw new NotFoundError("Attribute");

        const updateValues: any = {};
        if (data.name !== undefined) updateValues.name = data.name;
        if (data.slug !== undefined) updateValues.slug = data.slug;
        if (data.sortOrder !== undefined) updateValues.sortOrder = data.sortOrder;

        const [updated] = await db
            .update(productAttributes)
            .set(updateValues)
            .where(eq(productAttributes.id, attributeId))
            .returning();
        return updated!;
    }

    async deleteAttribute(productId: string, attributeId: string) {
        const attr = await db.query.productAttributes.findFirst({
            where: and(
                eq(productAttributes.id, attributeId),
                eq(productAttributes.productId, productId),
            ),
        });
        if (!attr) throw new NotFoundError("Attribute");
        const [deleted] = await db
            .delete(productAttributes)
            .where(eq(productAttributes.id, attributeId))
            .returning();
        return deleted!;
    }

    async addAttributeValue(
        productId: string,
        attributeId: string,
        data: CreateAttributeValue,
    ) {
        const attr = await db.query.productAttributes.findFirst({
            where: and(
                eq(productAttributes.id, attributeId),
                eq(productAttributes.productId, productId),
            ),
        });
        if (!attr) throw new NotFoundError("Attribute");
        const [value] = await db
            .insert(productAttributeValues)
            .values({
                attributeId,
                value: data.value,
                slug: data.slug ?? slugify(data.value),
                metadata: data.metadata ?? null,
                sortOrder: data.sortOrder ?? 0,
            })
            .returning();
        if (!value) throw new Error("Attribute value creation failed");
        return value;
    }

    async deleteAttributeValue(productId: string, attributeId: string, valueId: string) {
        const value = await db.query.productAttributeValues.findFirst({
            where: and(
                eq(productAttributeValues.id, valueId),
                eq(productAttributeValues.attributeId, attributeId),
            ),
        });
        if (!value) throw new NotFoundError("Attribute value");
        const [deleted] = await db
            .delete(productAttributeValues)
            .where(eq(productAttributeValues.id, valueId))
            .returning();
        return deleted!;
    }

    // ─── Specs (product-level) ────────────────────────────────────────────

    async listSpecs(productId: string) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
        });
        if (!product) throw new NotFoundError("Product");

        return db.query.productSpecs.findMany({
            where: eq(productSpecs.productId, productId),
            orderBy: [asc(productSpecs.sortOrder)],
        });
    }

    async addSpec(productId: string, data: CreateSpec) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
        });
        if (!product) throw new NotFoundError("Product");
        const [spec] = await db
            .insert(productSpecs)
            .values({
                productId,
                name: data.name,
                value: data.value,
                sortOrder: data.sortOrder ?? 0,
            })
            .returning();
        if (!spec) throw new Error("Spec creation failed");
        return spec;
    }

    async updateSpec(productId: string, specId: string, data: UpdateSpec) {
        const spec = await db.query.productSpecs.findFirst({
            where: and(eq(productSpecs.id, specId), eq(productSpecs.productId, productId)),
        });
        if (!spec) throw new NotFoundError("Spec");
        const updateValues: any = {};
        if (data.name !== undefined) updateValues.name = data.name;
        if (data.value !== undefined) updateValues.value = data.value;
        if (data.sortOrder !== undefined) updateValues.sortOrder = data.sortOrder;
        const [updated] = await db
            .update(productSpecs)
            .set(updateValues)
            .where(eq(productSpecs.id, specId))
            .returning();
        return updated!;
    }

    async deleteSpec(productId: string, specId: string) {
        const spec = await db.query.productSpecs.findFirst({
            where: and(eq(productSpecs.id, specId), eq(productSpecs.productId, productId)),
        });
        if (!spec) throw new NotFoundError("Spec");
        const [deleted] = await db
            .delete(productSpecs)
            .where(eq(productSpecs.id, specId))
            .returning();
        return deleted!;
    }

    // ─── Image operations (unchanged) ─────────────────────────────────────

    async listImages(productId: string) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
        });
        if (!product) throw new NotFoundError("Product");
        return db.query.productImages.findMany({
            where: eq(productImages.productId, productId),
            orderBy: (i, { asc }) => [asc(i.sortOrder)],
        });
    }

    async reorderImages(
        productId: string,
        items: { imageId: string; sortOrder: number }[],
    ) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
            with: { images: true },
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
            return tx.query.productImages.findMany({
                where: eq(productImages.productId, productId),
                orderBy: (i, { asc }) => [asc(i.sortOrder)],
            });
        });
    }

    async uploadImages(productId: string, imageFiles: FileUpload[]) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
            with: { images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] } },
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
            const nextSortOrder =
                product.images.length > 0
                    ? product.images[product.images.length - 1]!.sortOrder + 1
                    : 0;
            await db.insert(productImages).values(
                uploadedUrls.map((url, i) => ({
                    productId,
                    url,
                    sortOrder: nextSortOrder + i,
                })),
            );
            return db.query.productImages.findMany({
                where: eq(productImages.productId, productId),
                orderBy: (i, { asc }) => [asc(i.sortOrder)],
            });
        } catch (error) {
            for (const url of uploadedUrls) {
                const key = url.split("/").pop();
                if (key)
                    await uploadService
                        .deleteFile(`products/${key}`)
                        .catch(console.error);
            }
            throw error;
        }
    }

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
        if (image.url.includes("r2.dev")) {
            const key = image.url.split("/").pop();
            if (key)
                uploadService.deleteFile(`products/${key}`).catch(() => {});
        }
        return db.query.productImages.findMany({
            where: eq(productImages.productId, productId),
            orderBy: (i, { asc }) => [asc(i.sortOrder)],
        });
    }

    // ─── Bulk Import ───────────────────────────────────────────────────────

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

            if (data.categoryId) {
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
            }
            if (data.brandId) {
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
                    status: data.status,
                    hasVariants: data.hasVariants,
                    freeShipping: data.freeShipping,
                    weight: data.weight,
                    length: data.length,
                    width: data.width,
                    height: data.height,
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
            status: "published",
            hasVariants: "false",
            freeShipping: "false",
            weight: "0.500",
            length: "20",
            width: "15",
            height: "10",
            categoryId: "00000000-0000-0000-0000-000000000000",
            brandId: "00000000-0000-0000-0000-000000000000",
            images:
                '["https://example.com/image1.jpg","https://example.com/image2.jpg"]',
        };

        const headers: string[] = [
            ...REQUIRED_COLUMNS,
            "status",
            "hasVariants",
            "freeShipping",
            "weight",
            "length",
            "width",
            "height",
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

function slugify(s: string): string {
    return s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100);
}

export const productService = new ProductService();

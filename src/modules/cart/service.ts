import { eq, and, sql } from "drizzle-orm";
import { db } from "@/config/db.js";
import { cartItems } from "@/db/schema/cart.js";
import { products } from "@/db/schema/product.js";
import { productVariants } from "@/db/schema/productVariant.js";
import { NotFoundError, BadRequestError } from "@/shared/errors.js";
import { inventoryService } from "@/modules/inventory/service.js";
import type { AddCartItem, UpdateCartItem } from "./schema.js";

export class CartService {
    /**
     * List all items in the user's cart, joined with product + variant info.
     * Each item includes the computed `effectivePrice` (variant.salePrice ?? variant.basePrice)
     * and the variant's option attributes.
     */
    async get(userId: string) {
        const items = await db.query.cartItems.findMany({
            where: eq(cartItems.userId, userId),
            with: {
                product: { with: { images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] } } },
                variant: true,
            },
            orderBy: (c, { desc }) => [desc(c.createdAt)],
        });

        // Hydrate variant attribute values for display
        const variantIds = items.map((it) => it.variantId);
        const variantAttrs = variantIds.length
            ? await db.execute(sql`
                SELECT
                    pva.variant_id,
                    pa.name AS attribute_name,
                    pav.value
                FROM product_variant_attributes pva
                JOIN product_attribute_values pav ON pav.id = pva.attribute_value_id
                JOIN product_attributes pa ON pa.id = pav.attribute_id
                WHERE pva.variant_id = ANY(${variantIds})
            `)
            : { rows: [] as any[] };

        const attrByVariant = new Map<string, Array<{ name: string; value: string }>>();
        for (const row of (variantAttrs as any).rows ?? []) {
            const list = attrByVariant.get(row.variant_id) ?? [];
            list.push({ name: row.attribute_name, value: row.value });
            attrByVariant.set(row.variant_id, list);
        }

        return items.map((it) => {
            const v = it.variant;
            const base = Number(v.basePrice);
            const sale = v.salePrice ? Number(v.salePrice) : null;
            const effective = sale ?? base;
            return {
                id: it.id,
                productId: it.productId,
                variantId: it.variantId,
                quantity: it.quantity,
                price: it.price, // snapshot at time of add
                currentPrice: effective, // current effective price
                createdAt: it.createdAt,
                updatedAt: it.updatedAt,
                variant: {
                    id: v.id,
                    sku: v.sku,
                    name: v.name,
                    basePrice: v.basePrice,
                    salePrice: v.salePrice,
                    stock: v.stock,
                    isActive: v.isActive,
                    isDefault: v.isDefault,
                    attributes: attrByVariant.get(v.id) ?? [],
                },
                product: it.product
                    ? {
                          id: it.product.id,
                          name: it.product.name,
                          slug: it.product.slug,
                          status: it.product.status,
                          freeShipping: it.product.freeShipping,
                          hasVariants: it.product.hasVariants,
                          images: (it.product.images ?? []).map((img, idx) => ({
                              url: img.url,
                              sortOrder: img.sortOrder,
                              isPrimary: idx === 0,
                          })),
                      }
                    : null,
            };
        });
    }

    /**
     * Add (or merge with existing line) a variant to the user's cart.
     * Strict: variantId is required. The product is loaded to enforce it
     * belongs to the right product and is available.
     */
    async addItem(userId: string, data: AddCartItem) {
        const variant = await db.query.productVariants.findFirst({
            where: eq(productVariants.id, data.variantId),
            with: { product: true },
        });
        if (!variant) throw new NotFoundError("Variant");
        if (!variant.isActive) {
            throw new BadRequestError("This variant is not available for purchase");
        }
        if (variant.product.status !== "published") {
            throw new BadRequestError("This product is not available for purchase");
        }

        // Stock check using multi-warehouse aggregate
        const available = await inventoryService.getAvailableStock(variant.id);
        if (available < data.quantity) {
            throw new BadRequestError(
                `Insufficient stock for ${variant.name}. Available: ${available}, requested: ${data.quantity}`,
            );
        }

        const price = (variant.salePrice ? Number(variant.salePrice) : Number(variant.basePrice)).toFixed(2);

        // Find existing line for this user+variant
        const existing = await db.query.cartItems.findFirst({
            where: and(eq(cartItems.userId, userId), eq(cartItems.variantId, variant.id)),
        });

        if (existing) {
            const newQty = existing.quantity + data.quantity;
            if (available < newQty) {
                throw new BadRequestError(
                    `Insufficient stock for ${variant.name}. Available: ${available}, requested: ${newQty}`,
                );
            }
            const [updated] = await db
                .update(cartItems)
                .set({ quantity: newQty, price, updatedAt: new Date() })
                .where(eq(cartItems.id, existing.id))
                .returning();
            return updated!;
        }

        const [item] = await db
            .insert(cartItems)
            .values({
                userId,
                productId: variant.productId,
                variantId: variant.id,
                quantity: data.quantity,
                price,
            })
            .returning();
        return item!;
    }

    async updateItem(userId: string, itemId: string, data: UpdateCartItem) {
        const item = await db.query.cartItems.findFirst({
            where: and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)),
            with: { variant: true },
        });
        if (!item) throw new NotFoundError("Cart item");

        const available = await inventoryService.getAvailableStock(item.variantId);
        if (available < data.quantity) {
            throw new BadRequestError(
                `Insufficient stock for ${item.variant.name}. Available: ${available}, requested: ${data.quantity}`,
            );
        }

        const price = (
            item.variant.salePrice ? Number(item.variant.salePrice) : Number(item.variant.basePrice)
        ).toFixed(2);
        const [updated] = await db
            .update(cartItems)
            .set({ quantity: data.quantity, price, updatedAt: new Date() })
            .where(eq(cartItems.id, itemId))
            .returning();
        if (!updated) throw new NotFoundError("Cart item");
        return updated;
    }

    async removeItem(userId: string, itemId: string) {
        const result = await db
            .delete(cartItems)
            .where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)));
        return result;
    }

    async clear(userId: string) {
        await db.delete(cartItems).where(eq(cartItems.userId, userId));
    }

    /**
     * Internal helper used by the orders service: fetch the cart with full
     * variant + product info for order creation.
     */
    async getForOrder(userId: string) {
        return db.query.cartItems.findMany({
            where: eq(cartItems.userId, userId),
            with: { product: true, variant: true },
        });
    }
}

export const cartService = new CartService();

import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { eq } from "drizzle-orm";
import { db } from "@/config/db.js";
import { productVariants } from "@/db/schema/productVariant.js";
import { warehouseService } from "./service.js";
import { inventoryService } from "@/modules/inventory/service.js";
import {
    CreateWarehouseSchema,
    UpdateWarehouseSchema,
    WarehouseIdParamSchema,
    WarehouseParamsSchema,
    SetInventorySchema,
    InventoryIdParamSchema,
    AdjustInventorySchema,
    LowStockQuerySchema,
} from "./schema.js";
import { NotFoundError } from "@/shared/errors.js";
import { z } from "zod";

async function getProductIdForVariant(variantId: string): Promise<string> {
    const row = await db.query.productVariants.findFirst({
        where: eq(productVariants.id, variantId),
    });
    if (!row) throw new NotFoundError("Variant");
    return row.productId;
}

const warehouseRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Admin Warehouse CRUD ──────────────────────────────────────────────
    fastify.register(
        async (instance) => {
            const app = instance.withTypeProvider<ZodTypeProvider>();
            app.addHook("onRequest", fastify.authenticate);

            app.get("/", {
                preHandler: [fastify.requirePermission("read", "warehouses")],
                schema: {
                    tags: ["Admin | Warehouses"],
                    summary: "List warehouses",
                    querystring: WarehouseParamsSchema,
                },
                handler: async (request, reply) => {
                    const { rows, total } = await warehouseService.list(request.query);
                    return reply.sendPaginated(rows, {
                        page: request.query.page,
                        limit: request.query.limit,
                        total,
                    });
                },
            });

            app.post("/", {
                preHandler: [fastify.requirePermission("create", "warehouses")],
                schema: {
                    tags: ["Admin | Warehouses"],
                    summary: "Create warehouse",
                    body: CreateWarehouseSchema,
                },
                handler: async (request, reply) => {
                    const row = await warehouseService.create(request.body);
                    return reply.sendCreated(row);
                },
            });

            app.get("/:id", {
                preHandler: [fastify.requirePermission("read", "warehouses")],
                schema: {
                    tags: ["Admin | Warehouses"],
                    summary: "Get warehouse",
                    params: WarehouseIdParamSchema,
                },
                handler: async (request, reply) => {
                    return reply.sendOk(await warehouseService.getById(request.params.id));
                },
            });

            app.put("/:id", {
                preHandler: [fastify.requirePermission("update", "warehouses")],
                schema: {
                    tags: ["Admin | Warehouses"],
                    summary: "Update warehouse",
                    params: WarehouseIdParamSchema,
                    body: UpdateWarehouseSchema,
                },
                handler: async (request, reply) => {
                    return reply.sendOk(
                        await warehouseService.update(request.params.id, request.body),
                    );
                },
            });

            app.delete("/:id", {
                preHandler: [fastify.requirePermission("delete", "warehouses")],
                schema: {
                    tags: ["Admin | Warehouses"],
                    summary: "Delete warehouse",
                    params: WarehouseIdParamSchema,
                },
                handler: async (request, reply) => {
                    await warehouseService.delete(request.params.id);
                    return reply.sendOk(null, "Warehouse deleted successfully");
                },
            });

            // ─── Inventory in a specific warehouse ───────────────────────────

            app.get("/:id/inventory", {
                preHandler: [fastify.requirePermission("read", "warehouses")],
                schema: {
                    tags: ["Admin | Warehouses"],
                    summary: "List inventory in a specific warehouse",
                    params: WarehouseIdParamSchema,
                    querystring: z.object({
                        limit: z.coerce.number().int().positive().max(200).default(50),
                        offset: z.coerce.number().int().nonnegative().default(0),
                    }),
                },
                handler: async (request, reply) => {
                    const { rows, total } = await warehouseService.listInventory({
                        warehouseId: request.params.id,
                        limit: request.query.limit,
                        offset: request.query.offset,
                    });
                    return reply.sendPaginated(rows, {
                        page: 1,
                        limit: request.query.limit,
                        total,
                    });
                },
            });

            app.put("/:id/inventory/:variantId", {
                preHandler: [fastify.requirePermission("update", "warehouses")],
                schema: {
                    tags: ["Admin | Warehouses"],
                    summary: "Set absolute stock for a variant in this warehouse",
                    params: z.object({
                        id: WarehouseIdParamSchema.shape.id,
                        variantId: z.string().uuid(),
                    }),
                    body: SetInventorySchema,
                },
                handler: async (request, reply) => {
                    const row = await warehouseService.setInventory(
                        request.params.variantId,
                        request.params.id,
                        request.body,
                    );
                    return reply.sendOk(row);
                },
            });
        },
        { prefix: "/admin/warehouses" },
    );

    // ─── Admin Inventory (across all warehouses) ────────────────────────────
    fastify.register(
        async (instance) => {
            const app = instance.withTypeProvider<ZodTypeProvider>();
            app.addHook("onRequest", fastify.authenticate);
            app.addHook("onRequest", fastify.adminOnly);

            app.get("/list", {
                schema: {
                    tags: ["Admin | Inventory"],
                    summary: "List all inventory rows (variant × warehouse)",
                    querystring: z.object({
                        warehouseId: z.string().uuid().optional(),
                        limit: z.coerce.number().int().positive().max(200).default(100),
                        offset: z.coerce.number().int().nonnegative().default(0),
                    }),
                },
                handler: async (request, reply) => {
                    const opts: { warehouseId?: string; limit?: number; offset?: number } = {
                        limit: request.query.limit,
                        offset: request.query.offset,
                    };
                    if (request.query.warehouseId) opts.warehouseId = request.query.warehouseId;
                    const { rows, total } = await warehouseService.listInventory(opts);
                    return reply.sendPaginated(rows, {
                        page: 1,
                        limit: request.query.limit,
                        total,
                    });
                },
            });

            app.get("/low-stock", {
                schema: {
                    tags: ["Admin | Inventory"],
                    summary: "List inventory at or below the low-stock threshold",
                    querystring: LowStockQuerySchema,
                },
                handler: async (request, reply) => {
                    const opts: { warehouseId?: string; limit?: number } = { limit: request.query.limit };
                    if (request.query.warehouseId) opts.warehouseId = request.query.warehouseId;
                    const rows = await warehouseService.getLowStock(opts);
                    return reply.sendOk(rows);
                },
            });

            app.post("/adjust", {
                schema: {
                    tags: ["Admin | Inventory"],
                    summary: "Manually adjust variant stock in a warehouse",
                    description:
                        "Use this for stock-in, stock-out, manual adjustments, or restocks. For order deductions and returns, the order pipeline handles it automatically.",
                    body: AdjustInventorySchema,
                },
                handler: async (request, reply) => {
                    const result = await warehouseService.adjustInventory(request.body);
                    const logData: any = {
                        productId: await getProductIdForVariant(request.body.variantId),
                        variantId: request.body.variantId,
                        warehouseId: result.warehouseId,
                        quantityChange: request.body.quantityChange,
                        type: request.body.type,
                        performedBy: request.user.id,
                        stockAfter: result.row.quantity,
                    };
                    if (request.body.note !== undefined) logData.note = request.body.note;
                    await inventoryService.logAdjustment(logData);
                    return reply.sendOk(result.row);
                },
            });
        },
        { prefix: "/admin/inventory" },
    );
};

export default warehouseRoutes;

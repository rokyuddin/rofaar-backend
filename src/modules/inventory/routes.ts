import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { inventoryService } from "./service.js";
import { z } from "zod";

/**
 * Legacy product-level inventory routes. New code should use the variant +
 * warehouse routes from /admin/inventory/* (registered by the warehouses
 * module) and /admin/warehouses/:id/inventory/*.
 *
 * Kept for the logs endpoint (read-only) so admins can still view history
 * with optional product filter.
 */
const inventoryRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook("onRequest", fastify.authenticate);
        app.addHook("onRequest", fastify.adminOnly);

        app.get("/logs", {
            schema: {
                tags: ["Admin | Inventory"],
                summary: "Get inventory logs",
                description:
                    "Returns a history of stock adjustments, optionally filtered by product id. For variant/warehouse-scoped logs, query by product id of the variant's product.",
                querystring: z.object({
                    productId: z.string().uuid().optional(),
                }),
            },
            handler: async (request, reply) => {
                const logs = await inventoryService.getLogs(request.query.productId);
                return reply.sendOk(logs);
            },
        });
    }, { prefix: "/admin/inventory" });
};

export default inventoryRoutes;

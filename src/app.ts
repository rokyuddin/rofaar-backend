import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { env } from "@/config/env.js";

// Plugins
import zodPlugin from "@/plugins/zod.js";
import authPlugin from "@/plugins/auth.js";
import errorHandlerPlugin from "@/plugins/error-handler.js";
import responsePlugin from "@/plugins/response.js";
import swaggerPlugin from "@/plugins/swagger.js";
import { loggerService } from "@/shared/services/logger.js";

// Routes
import authRoutes from "@/modules/auth/routes.js";
import productRoutes from "@/modules/products/routes.js";
import uploadRoutes from "@/modules/uploads/routes.js";
import categoryRoutes from "@/modules/categories/routes.js";
import brandRoutes from "@/modules/brands/routes.js";
import bannerRoutes from "@/modules/banners/routes.js";
import advertisementRoutes from "@/modules/advertisements/routes.js";
import contactRoutes from "@/modules/contact/routes.js";
import cartRoutes from "@/modules/cart/routes.js";
import orderRoutes from "@/modules/orders/routes.js";
import wishlistRoutes from "@/modules/wishlist/routes.js";
import addressRoutes from "@/modules/addresses/routes.js";
import couponRoutes from "@/modules/coupons/routes.js";
import reviewRoutes from "@/modules/reviews/routes.js";
import adminRoutes from "@/modules/admin/routes.js";
import paymentRoutes from "@/modules/payments/routes.js";
import shippingRoutes from "@/modules/shipping/routes.js";
import refundRoutes from "@/modules/refunds/routes.js";
import inventoryRoutes from "@/modules/inventory/routes.js";
import userRoutes from "@/modules/users/routes.js";
import qaRoutes from "@/modules/qa/routes.js";
import searchRoutes from "@/modules/search/routes.js";
import rbacRoutes from "@/modules/rbac/routes.js";

export async function buildApp() {
  const app = Fastify({
    logger:
      process.env["NODE_ENV"] === "development"
        ? {
            transport: {
              target: "pino-pretty",
              options: { translateTime: "HH:MM:ss Z" },
            },
          }
        : process.env["NODE_ENV"] === "production",
    trustProxy: true,
  });

// ─── Core Plugins (Must be first) ──────────────────────────────────────────
   await app.register(zodPlugin);
   await app.register(responsePlugin);
   await app.register(cookie, { secret: env.JWT_SECRET });
   await app.register(multipart);
   await app.register(authPlugin); // Register auth early for decorators
   await app.register(swaggerPlugin);

  // ─── Utility Plugins ──────────────────────────────────────────────────────
  await app.register(errorHandlerPlugin);
  await app.register(cors, { origin: process.env["CORS_ORIGIN"] ?? "*" });
  await app.register(helmet, { global: true });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

  // ─── Logging Hook ────────────────────────────────────────────────────────
  app.addHook("onResponse", async (request, reply) => {
    const level =
      reply.statusCode >= 500
        ? "error"
        : reply.statusCode >= 400
          ? "warn"
          : "info";
    const message = `${request.method} ${request.url} - ${reply.statusCode}`;

    const context = {
      ip: request.ip,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      userId: (request as any).user?.id,
    };

    void loggerService.log(level, message, context);
  });

  // ─── Health check (BEFORE auth plugin to keep it public) ─────────────────
  app.get("/", async (_request, reply) => {
    return reply.sendOk({
      status: "ok",
      message: "Rofaar Backend API is running",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/health", async (_request, reply) => {
    return reply.sendOk({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ─── API routes ───────────────────────────────────────────────────────────
  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(productRoutes);
      await api.register(categoryRoutes);
      await api.register(brandRoutes);
      await api.register(bannerRoutes);
      await api.register(advertisementRoutes);
      await api.register(contactRoutes);
      await api.register(cartRoutes);
      await api.register(orderRoutes);
      await api.register(wishlistRoutes);
      await api.register(addressRoutes);
      await api.register(couponRoutes);
      await api.register(reviewRoutes);
      await api.register(adminRoutes);
      await api.register(paymentRoutes);
      await api.register(shippingRoutes);
      await api.register(refundRoutes);
      await api.register(inventoryRoutes);
      await api.register(userRoutes);
      await api.register(qaRoutes);
      await api.register(searchRoutes);
      await api.register(rbacRoutes);
      await api.register(uploadRoutes);
    },
    { prefix: "/api/v1" },
  );

  return app;
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { env } from '@/config/env.js';

// Plugins
import zodPlugin from '@/plugins/zod.js';
import authPlugin from '@/plugins/auth.js';
import errorHandlerPlugin from '@/plugins/error-handler.js';
import responsePlugin from '@/plugins/response.js';
import swaggerPlugin from '@/plugins/swagger.js';
import { loggerService } from '@/shared/services/logger.js';

// Routes
import authRoutes from '@/modules/auth/routes.js';
import productRoutes from '@/modules/products/routes.js';
import categoryRoutes from '@/modules/categories/routes.js';
import brandRoutes from '@/modules/brands/routes.js';
import bannerRoutes from '@/modules/banners/routes.js';
import advertisementRoutes from '@/modules/advertisements/routes.js';
import contactRoutes from '@/modules/contact/routes.js';
import cartRoutes from '@/modules/cart/routes.js';
import orderRoutes from '@/modules/orders/routes.js';
import wishlistRoutes from '@/modules/wishlist/routes.js';
import addressRoutes from '@/modules/addresses/routes.js';
import couponRoutes from '@/modules/coupons/routes.js';
import reviewRoutes from '@/modules/reviews/routes.js';
import adminRoutes from '@/modules/admin/routes.js';
import paymentRoutes from '@/modules/payments/routes.js';
import shippingRoutes from '@/modules/shipping/routes.js';
import refundRoutes from '@/modules/refunds/routes.js';
import inventoryRoutes from '@/modules/inventory/routes.js';
import userRoutes from '@/modules/users/routes.js';
import qaRoutes from '@/modules/qa/routes.js';
import searchRoutes from '@/modules/search/routes.js';

export async function buildApp() {
    const app = Fastify({
        logger:
            process.env['NODE_ENV'] === 'development'
                ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z' } } }
                : process.env['NODE_ENV'] === 'production',
        trustProxy: true,
    });

    const apiVersion = '/api/v1';

    // ─── Core Plugins (Must be first) ──────────────────────────────────────────
    await app.register(zodPlugin);
    await app.register(responsePlugin);
    await app.register(cookie, { secret: env.JWT_SECRET });
    await app.register(authPlugin); // Register auth early for decorators
    await app.register(swaggerPlugin);

    // ─── Utility Plugins ──────────────────────────────────────────────────────
    await app.register(errorHandlerPlugin);
    await app.register(cors, { origin: process.env['CORS_ORIGIN'] ?? '*' });
    await app.register(helmet, { global: true });
    await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

    // ─── Logging Hook ────────────────────────────────────────────────────────
    app.addHook('onResponse', async (request, reply) => {
        const level = reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warn' : 'info';
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
    app.get('/', async (_request, reply) => {
        return reply.sendOk({
            status: 'ok',
            message: 'Rofaar Backend API is running',
            timestamp: new Date().toISOString(),
        });
    });

    app.get('/health', async (_request, reply) => {
        return reply.sendOk({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });

    // ─── API v1 routes ────────────────────────────────────────────────────────
    await app.register(authRoutes, { prefix: `${apiVersion}/auth` });
    await app.register(productRoutes, { prefix: `${apiVersion}/products` });
    await app.register(categoryRoutes, { prefix: `${apiVersion}/categories` });
    await app.register(brandRoutes, { prefix: `${apiVersion}/brands` });
    await app.register(bannerRoutes, { prefix: `${apiVersion}/banners` });
    await app.register(advertisementRoutes, { prefix: `${apiVersion}/advertisements` });
    await app.register(contactRoutes, { prefix: `${apiVersion}/contact` });
    await app.register(cartRoutes, { prefix: `${apiVersion}/cart` });
    await app.register(orderRoutes, { prefix: `${apiVersion}/orders` });
    await app.register(wishlistRoutes, { prefix: `${apiVersion}/wishlist` });
    await app.register(addressRoutes, { prefix: `${apiVersion}/addresses` });
    await app.register(couponRoutes, { prefix: `${apiVersion}/coupons` });
    await app.register(reviewRoutes, { prefix: `${apiVersion}/reviews` });
    await app.register(adminRoutes, { prefix: `${apiVersion}/admin` });
    await app.register(paymentRoutes, { prefix: `${apiVersion}/payments` });
    await app.register(shippingRoutes, { prefix: `${apiVersion}/shipping` });
    await app.register(refundRoutes, { prefix: `${apiVersion}/refunds` });
    await app.register(inventoryRoutes, { prefix: `${apiVersion}/inventory` });
    await app.register(userRoutes, { prefix: `${apiVersion}/users` });
    await app.register(qaRoutes, { prefix: `${apiVersion}/qa` });
    await app.register(searchRoutes, { prefix: `${apiVersion}/search` });

    return app;
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

// Plugins
import zodPlugin from '@/plugins/zod.js';
import authPlugin from '@/plugins/auth.js';
import errorHandlerPlugin from '@/plugins/error-handler.js';
import swaggerPlugin from '@/plugins/swagger.js';

// Routes
import authRoutes from '@/modules/auth/routes.js';
import productRoutes from '@/modules/products/routes.js';
import categoryRoutes from '@/modules/categories/routes.js';
import cartRoutes from '@/modules/cart/routes.js';
import orderRoutes from '@/modules/orders/routes.js';
import wishlistRoutes from '@/modules/wishlist/routes.js';
import addressRoutes from '@/modules/addresses/routes.js';
import couponRoutes from '@/modules/coupons/routes.js';
import comboRoutes from '@/modules/combos/routes.js';
import reviewRoutes from '@/modules/reviews/routes.js';
import adminRoutes from '@/modules/admin/routes.js';
import paymentRoutes from '@/modules/payments/routes.js';

export async function buildApp() {
    const app = Fastify({
        logger:
            process.env['NODE_ENV'] !== 'test'
                ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z' } } }
                : false,
        trustProxy: true,
    });

    const apiVersion = '/api/v1';

    // ─── Core Plugins (Must be first) ──────────────────────────────────────────
    await app.register(zodPlugin);
    await app.register(authPlugin); // Register auth early for decorators
    await app.register(swaggerPlugin);

    // ─── Utility Plugins ──────────────────────────────────────────────────────
    await app.register(errorHandlerPlugin);
    await app.register(cors, { origin: process.env['CORS_ORIGIN'] ?? '*' });
    await app.register(helmet, { global: true });
    await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

    // ─── Health check (BEFORE auth plugin to keep it public) ─────────────────
    app.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    }));

    // ─── Route registration ──────────────────────────────────────────────────
    await app.register(authRoutes, { prefix: `${apiVersion}/auth` });
    await app.register(categoryRoutes, { prefix: `${apiVersion}` });
    await app.register(productRoutes, { prefix: `${apiVersion}` });
    await app.register(cartRoutes, { prefix: `${apiVersion}` });
    await app.register(orderRoutes, { prefix: `${apiVersion}` });
    await app.register(wishlistRoutes, { prefix: `${apiVersion}` });
    await app.register(addressRoutes, { prefix: `${apiVersion}` });
    await app.register(couponRoutes, { prefix: `${apiVersion}` });
    await app.register(comboRoutes, { prefix: `${apiVersion}` });
    await app.register(reviewRoutes, { prefix: `${apiVersion}` });
    await app.register(paymentRoutes, { prefix: `${apiVersion}` });
    await app.register(adminRoutes, { prefix: `${apiVersion}` });

    return app;
}

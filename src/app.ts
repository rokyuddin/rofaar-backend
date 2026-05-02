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
import brandRoutes from '@/modules/brands/routes.js';
import bannerRoutes from '@/modules/banners/routes.js';
import advertisementRoutes from '@/modules/advertisements/routes.js';
import contactRoutes from '@/modules/contact/routes.js';


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

    // ─── API v1 routes ────────────────────────────────────────────────────────
    await app.register(authRoutes, { prefix: '/api/v1/auth' });
    await app.register(productRoutes, { prefix: '/api/v1' });
    await app.register(categoryRoutes, { prefix: '/api/v1' });
    await app.register(brandRoutes, { prefix: '/api/v1' });
    await app.register(bannerRoutes, { prefix: '/api/v1' });
    await app.register(advertisementRoutes, { prefix: '/api/v1' });
    await app.register(contactRoutes, { prefix: '/api/v1' });


    await app.register(cartRoutes, { prefix: '/api/v1' });
    await app.register(orderRoutes, { prefix: '/api/v1' });
    await app.register(wishlistRoutes, { prefix: '/api/v1' });
    await app.register(addressesRoutes, { prefix: '/api/v1' });
    await app.register(couponRoutes, { prefix: '/api/v1' });
    await app.register(combosRoutes, { prefix: '/api/v1' });
    await app.register(reviewsRoutes, { prefix: '/api/v1' });
    await app.register(adminRoutes, { prefix: '/api/v1' });
    await app.register(paymentsRoutes, { prefix: '/api/v1' });

    return app;
}

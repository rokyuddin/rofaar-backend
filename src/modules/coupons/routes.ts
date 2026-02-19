import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { success } from '@/shared/response.js';

const couponRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.get('/coupons', {
        handler: async () => success([], 'Coupons module stub'),
    });
};

export default fp(couponRoutes, { name: 'coupon-routes' });

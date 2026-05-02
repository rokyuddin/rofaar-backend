import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { couponService } from './service.js';
import { CreateCouponSchema, UpdateCouponSchema, ValidateCouponSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';

const couponRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Public/User Routes ──────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();

    // ─── Protected Routes (User) ──────────────────────────────────────────────

    f.post('/coupons/validate', {
        preHandler: [fastify.authenticate],
        schema: { body: ValidateCouponSchema },
        handler: async (request) => {
            const result = await couponService.validate(request.body.code, request.body.orderAmount);
            return success(result);
        },
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────

    f.get('/admin/coupons', {
        preHandler: [fastify.requirePermission('read', 'coupons')],
        handler: async () => {
            const result = await couponService.list();
            return success(result);
        },
    });

    f.post('/admin/coupons', {
        preHandler: [fastify.requirePermission('create', 'coupons')],
        schema: { body: CreateCouponSchema },
        handler: async (request, reply) => {
            const result = await couponService.create(request.body);
            return reply.code(201).send(success(result));
        },
    });

    f.put('/admin/coupons/:id', {
        preHandler: [fastify.requirePermission('update', 'coupons')],
        schema: { params: IdParamSchema, body: UpdateCouponSchema },
        handler: async (request) => {
            const result = await couponService.update(request.params.id, request.body);
            return success(result);
        },
    });

    f.delete('/admin/coupons/:id', {
        preHandler: [fastify.requirePermission('delete', 'coupons')],
        schema: { params: IdParamSchema },
        handler: async (request) => {
            await couponService.delete(request.params.id);
            return success(null, 'Coupon deleted successfully');
        },
    });
};

export default fp(couponRoutes, { name: 'coupon-routes' });

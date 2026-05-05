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
        const f = instance.withTypeProvider<ZodTypeProvider>();

        f.post('/coupons/validate', {
            preHandler: [fastify.authenticate],
            schema: { body: ValidateCouponSchema },
            handler: async (request) => {
                const result = await couponService.validate(request.body.code, request.body.orderAmount);
                return success(result);
            },
        });

        // ─── Admin Routes ─────────────────────────────────────────────────────────
        fastify.register(async (adminInstance) => {
            const app = adminInstance.withTypeProvider<ZodTypeProvider>();
            app.addHook('onRequest', fastify.authenticate);

            app.get('/', {
                preHandler: [fastify.requirePermission('read', 'coupons')],
                handler: async () => {
                    const result = await couponService.list();
                    return success(result);
                },
            });

            app.post('/', {
                preHandler: [fastify.requirePermission('create', 'coupons')],
                schema: { body: CreateCouponSchema },
                handler: async (request, reply) => {
                    const result = await couponService.create(request.body);
                    return reply.code(201).send(success(result));
                },
            });

            app.put('/:id', {
                preHandler: [fastify.requirePermission('update', 'coupons')],
                schema: { params: IdParamSchema, body: UpdateCouponSchema },
                handler: async (request) => {
                    const result = await couponService.update(request.params.id, request.body);
                    return success(result);
                },
            });

            app.delete('/:id', {
                preHandler: [fastify.requirePermission('delete', 'coupons')],
                schema: { params: IdParamSchema },
                handler: async (request) => {
                    await couponService.delete(request.params.id);
                    return success(null, 'Coupon deleted successfully');
                },
            });
        }, { prefix: '/admin/coupons' });
    });
};

export default fp(couponRoutes, { name: 'coupon-routes' });

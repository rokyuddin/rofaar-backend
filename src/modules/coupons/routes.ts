import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { couponService } from './service.js';
import { ValidateCouponSchema, CreateCouponSchema, UpdateCouponSchema } from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const couponRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Public/Customer Routes ────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.post('/validate', {
            schema: {
                tags: ['Orders'],
                summary: 'Validate coupon',
                body: ValidateCouponSchema
            },
            handler: async (request, reply) => {
                const result = await couponService.validate(request.body.code, request.body.orderAmount);
                return reply.sendOk(result);
            },
        });
    }, { prefix: '/coupons' });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.get('/', {
            preHandler: [fastify.requirePermission('read', 'coupons')],
            schema: {
                tags: ['Admin | Coupons'],
                summary: 'List coupons',
            },
            handler: async (_request, reply) => {
                const coupons = await couponService.list();
                return reply.sendOk(coupons);
            },
        });

        app.post('/', {
            preHandler: [fastify.requirePermission('create', 'coupons')],
            schema: {
                tags: ['Admin | Coupons'],
                summary: 'Create coupon',
                body: CreateCouponSchema
            },
            handler: async (request, reply) => {
                const coupon = await couponService.create(request.body);
                return reply.sendCreated(coupon);
            },
        });

        app.put('/:id', {
            preHandler: [fastify.requirePermission('update', 'coupons')],
            schema: {
                tags: ['Admin | Coupons'],
                summary: 'Update coupon',
                params: IdParamSchema,
                body: UpdateCouponSchema
            },
            handler: async (request, reply) => {
                const coupon = await couponService.update(request.params.id, request.body);
                return reply.sendOk(coupon);
            },
        });

        app.delete('/:id', {
            preHandler: [fastify.requirePermission('delete', 'coupons')],
            schema: {
                tags: ['Admin | Coupons'],
                summary: 'Delete coupon',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                await couponService.delete(request.params.id);
                return reply.sendOk(null, 'Coupon deleted successfully');
            },
        });
    }, { prefix: '/admin/coupons' });
};

export default couponRoutes;

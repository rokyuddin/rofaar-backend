import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { couponService } from './service.js';
import { success } from '@/shared/response.js';
import { createSwaggerConfig } from '@/shared/swagger.js';
import { IdParamSchema } from '@/shared/types.js';
import {
    CreateCouponSchema,
    UpdateCouponSchema,
    ValidateCouponSchema,
    DeleteCouponSchema,
} from './schema.js';
import type {
    CreateCouponBody,
    UpdateCouponBody,
    ValidateCouponQuery,
    DeleteCouponBody,
} from './schema.js';

const couponRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Public/User Routes ──────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();

        // GET /coupons/validate
        app.get('/validate', {
            schema: {
                ...createSwaggerConfig(['User | Coupons'], 'Validate Coupon', 'Check if a coupon is valid', false),
                querystring: ValidateCouponSchema,
            },
            handler: async (request) => {
                const { code, amount } = request.query as ValidateCouponQuery;
                const coupon = await couponService.validate(code, amount);
                return success(coupon, 'Coupon is valid');
            },
        });
    }, { prefix: '/coupons' });

    // ─── Admin Routes ────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.adminOnly);

        // GET /admin/coupons/list
        app.get('/list', {
            schema: {
                ...createSwaggerConfig(['Admin | Coupons'], 'List Coupons', 'Get all coupons', true),
            },
            handler: async () => {
                const result = await couponService.list();
                return success(result);
            },
        });

        // POST /admin/coupons/create
        app.post('/create', {
            schema: {
                ...createSwaggerConfig(['Admin | Coupons'], 'Create Coupon', 'Add a new coupon', true),
                body: CreateCouponSchema,
            },
            handler: async (request, reply) => {
                const result = await couponService.create(request.body as CreateCouponBody);
                return reply.code(201).send(success(result));
            },
        });

        // PUT /admin/coupons/update
        app.put('/update', {
            schema: {
                ...createSwaggerConfig(['Admin | Coupons'], 'Update Coupon', 'Update an existing coupon', true),
                body: UpdateCouponSchema,
            },
            handler: async (request) => {
                const { id, ...data } = request.body as UpdateCouponBody;
                const result = await couponService.update(id, data as UpdateCouponBody);
                return success(result);
            },
        });

        // DELETE /admin/coupons/delete
        app.delete('/delete', {
            schema: {
                ...createSwaggerConfig(['Admin | Coupons'], 'Delete Coupon', 'Remove a coupon', true),
                body: DeleteCouponSchema,
            },
            handler: async (request) => {
                const { id } = request.body as DeleteCouponBody;
                await couponService.delete(id);
                return success(null, 'Coupon deleted');
            },
        });
    }, { prefix: '/admin/coupons' });
};

export default couponRoutes;

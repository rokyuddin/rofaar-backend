import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { bannerService } from './service.js';
import { CreateBannerSchema, UpdateBannerSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';

const bannerRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Public Routes ────────────────────────────────────────────────────────

    f.get('/banners', {
        handler: async () => {
            const result = await bannerService.list(true);
            return success(result);
        },
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────

    f.get('/admin/banners', {
        preHandler: [fastify.requirePermission('read', 'banners')],
        handler: async () => {
            const result = await bannerService.list(false);
            return success(result);
        },
    });

    f.post('/admin/banners', {
        preHandler: [fastify.requirePermission('create', 'banners')],
        schema: { body: CreateBannerSchema },
        handler: async (request, reply) => {
            const result = await bannerService.create(request.body);
            return reply.code(201).send(success(result));
        },
    });

    f.put('/admin/banners/:id', {
        preHandler: [fastify.requirePermission('update', 'banners')],
        schema: { params: IdParamSchema, body: UpdateBannerSchema },
        handler: async (request) => {
            const result = await bannerService.update(request.params.id, request.body);
            return success(result);
        },
    });

    f.delete('/admin/banners/:id', {
        preHandler: [fastify.requirePermission('delete', 'banners')],
        schema: { params: IdParamSchema },
        handler: async (request) => {
            await bannerService.delete(request.params.id);
            return success(null, 'Banner deleted successfully');
        },
    });
};

export default fp(bannerRoutes, { name: 'banner-routes' });

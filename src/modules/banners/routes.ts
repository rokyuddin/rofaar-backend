import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { bannerService } from './service.js';
import { CreateBannerSchema, UpdateBannerSchema } from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const bannerRoutes: FastifyPluginAsync = async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Public Routes ─────────────────────────────────────────────────────────
    app.get('/banners', {
        schema: {
            tags: ['Banners'],
            summary: 'List banners',
            description: 'Returns all active banners.',
        },
        handler: async (_request, reply) => {
            const banners = await bannerService.list();
            return reply.sendOk(banners);
        },
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.get('/', {
            preHandler: [fastify.requirePermission('read', 'banners')],
            schema: {
                tags: ['Admin | Banners'],
                summary: 'List all banners (Admin)',
                description: 'Returns all banners including inactive ones.',
            },
            handler: async (_request, reply) => {
                const banners = await bannerService.list(false);
                return reply.sendOk(banners);
            },
        });

        app.post('/', {
            preHandler: [fastify.requirePermission('create', 'banners')],
            schema: {
                tags: ['Admin | Banners'],
                summary: 'Create banner',
                body: CreateBannerSchema
            },
            handler: async (request, reply) => {
                const banner = await bannerService.create(request.body);
                return reply.sendCreated(banner);
            },
        });

        app.put('/:id', {
            preHandler: [fastify.requirePermission('update', 'banners')],
            schema: {
                tags: ['Admin | Banners'],
                summary: 'Update banner',
                params: IdParamSchema,
                body: UpdateBannerSchema
            },
            handler: async (request, reply) => {
                const banner = await bannerService.update(request.params.id, request.body);
                return reply.sendOk(banner);
            },
        });

        app.delete('/:id', {
            preHandler: [fastify.requirePermission('delete', 'banners')],
            schema: {
                tags: ['Admin | Banners'],
                summary: 'Delete banner',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                await bannerService.delete(request.params.id);
                return reply.sendOk(null, 'Banner deleted successfully');
            },
        });
    }, { prefix: '/admin/banners' });
};

export default bannerRoutes;

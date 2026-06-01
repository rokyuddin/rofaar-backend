import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { brandService } from './service.js';
import { CreateBrandSchema, UpdateBrandSchema } from './schema.js';
import { IdParamSchema, SlugParamSchema } from '@/shared/types.js';

const brandRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Public Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();

        app.get('/', {
            schema: {
                tags: ['Brands'],
                summary: 'List brands',
                description: 'Returns all active brands.',
            },
            handler: async (_request, reply) => {
                const brands = await brandService.list();
                return reply.sendOk(brands);
            },
        });

        app.get('/:slug', {
            schema: {
                tags: ['Brands'],
                summary: 'Get brand by slug',
                description: 'Returns a single brand by its slug.',
                params: SlugParamSchema
            },
            handler: async (request, reply) => {
                const brand = await brandService.getBySlug(request.params.slug);
                return reply.sendOk(brand);
            },
        });
    });

};

export default brandRoutes;

export const brandAdminRoutes: FastifyPluginAsync = async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>();
    app.addHook('onRequest', fastify.authenticate);

    app.get('/', {
        preHandler: [fastify.requirePermission('read', 'brands')],
        schema: {
            tags: ['Admin | Brands'],
            summary: 'List brands (Admin)',
        },
        handler: async (_request, reply) => {
            const brands = await brandService.list();
            return reply.sendOk(brands);
        },
    });

    app.post('/create', {
        preHandler: [fastify.requirePermission('create', 'brands')],
        schema: {
            tags: ['Admin | Brands'],
            summary: 'Create brand',
            body: CreateBrandSchema
        },
        handler: async (request, reply) => {
            const brand = await brandService.create(request.body);
            return reply.sendCreated(brand);
        },
    });

    app.put('/update/:id', {
        preHandler: [fastify.requirePermission('update', 'brands')],
        schema: {
            tags: ['Admin | Brands'],
            summary: 'Update brand',
            params: IdParamSchema,
            body: UpdateBrandSchema
        },
        handler: async (request, reply) => {
            const brand = await brandService.update(request.params.id, request.body);
            return reply.sendOk(brand);
        },
    });

    app.delete('/delete/:id', {
        preHandler: [fastify.requirePermission('delete', 'brands')],
        schema: {
            tags: ['Admin | Brands'],
            summary: 'Delete brand',
            params: IdParamSchema
        },
        handler: async (request, reply) => {
            await brandService.delete(request.params.id);
            return reply.sendOk(null, 'Brand deleted successfully');
        },
    });
};

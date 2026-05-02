import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { brandService } from './service.js';
import { CreateBrandSchema, UpdateBrandSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema, SlugParamSchema } from '@/shared/types.js';

const brandRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Public Routes ────────────────────────────────────────────────────────

    f.get('/brands', {
        handler: async () => {
            const result = await brandService.list();
            return success(result);
        },
    });

    f.get('/brands/:slug', {
        schema: { params: SlugParamSchema },
        handler: async (request) => {
            const result = await brandService.getBySlug(request.params.slug);
            return success(result);
        },
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────

    f.post('/admin/brands', {
        preHandler: [fastify.requirePermission('create', 'brands')],
        schema: { body: CreateBrandSchema },
        handler: async (request, reply) => {
            const result = await brandService.create(request.body);
            return reply.code(201).send(success(result));
        },
    });

    f.put('/admin/brands/:id', {
        preHandler: [fastify.requirePermission('update', 'brands')],
        schema: { params: IdParamSchema, body: UpdateBrandSchema },
        handler: async (request) => {
            const result = await brandService.update(request.params.id, request.body);
            return success(result);
        },
    });

    f.delete('/admin/brands/:id', {
        preHandler: [fastify.requirePermission('delete', 'brands')],
        schema: { params: IdParamSchema },
        handler: async (request) => {
            await brandService.delete(request.params.id);
            return success(null, 'Brand deleted successfully');
        },
    });
};

export default fp(brandRoutes, { name: 'brand-routes' });

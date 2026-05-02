import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { advertisementService } from './service.js';
import { CreateAdvertisementSchema, UpdateAdvertisementSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';
import { z } from 'zod';

const advertisementRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Public Routes ────────────────────────────────────────────────────────

    f.get('/advertisements', {
        schema: {
            querystring: z.object({
                position: z.string().optional(),
            }),
        },
        handler: async (request) => {
            const result = await advertisementService.list({ 
                position: request.query.position, 
                onlyActive: true 
            });
            return success(result);
        },
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────

    f.get('/admin/advertisements', {
        preHandler: [fastify.requirePermission('read', 'advertisements')],
        handler: async () => {
            const result = await advertisementService.list({ onlyActive: false });
            return success(result);
        },
    });

    f.post('/admin/advertisements', {
        preHandler: [fastify.requirePermission('create', 'advertisements')],
        schema: { body: CreateAdvertisementSchema },
        handler: async (request, reply) => {
            const result = await advertisementService.create(request.body);
            return reply.code(201).send(success(result));
        },
    });

    f.put('/admin/advertisements/:id', {
        preHandler: [fastify.requirePermission('update', 'advertisements')],
        schema: { params: IdParamSchema, body: UpdateAdvertisementSchema },
        handler: async (request) => {
            const result = await advertisementService.update(request.params.id, request.body);
            return success(result);
        },
    });

    f.delete('/admin/advertisements/:id', {
        preHandler: [fastify.requirePermission('delete', 'advertisements')],
        schema: { params: IdParamSchema },
        handler: async (request) => {
            await advertisementService.delete(request.params.id);
            return success(null, 'Advertisement deleted successfully');
        },
    });
};

export default fp(advertisementRoutes, { name: 'advertisement-routes' });

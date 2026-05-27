import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { shippingService } from './service.js';
import {
    CreateShippingZoneSchema,
    UpdateShippingZoneSchema,
    CreateShippingMethodSchema,
    UpdateShippingMethodSchema
} from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const shippingRoutes: FastifyPluginAsync = async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Public Routes ─────────────────────────────────────────────────────────
    app.get('/shipping', {
        schema: {
            tags: ['Orders'],
            summary: 'List shipping options',
            description: 'Returns all available shipping zones and methods.',
        },
        handler: async (_request, reply) => {
            const zones = await shippingService.getZones();
            return reply.sendOk(zones);
        },
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        // Zones
        app.post('/zones', {
            preHandler: [fastify.requirePermission('create', 'shipping')],
            schema: {
                tags: ['Admin | Shipping'],
                summary: 'Create shipping zone',
                body: CreateShippingZoneSchema
            },
            handler: async (request, reply) => {
                const zone = await shippingService.createZone(request.body);
                return reply.sendCreated(zone);
            },
        });

        app.put('/zones/:id', {
            preHandler: [fastify.requirePermission('update', 'shipping')],
            schema: {
                tags: ['Admin | Shipping'],
                summary: 'Update shipping zone',
                params: IdParamSchema,
                body: UpdateShippingZoneSchema
            },
            handler: async (request, reply) => {
                const zone = await shippingService.updateZone(request.params.id, request.body);
                return reply.sendOk(zone);
            },
        });

        app.delete('/zones/:id', {
            preHandler: [fastify.requirePermission('delete', 'shipping')],
            schema: {
                tags: ['Admin | Shipping'],
                summary: 'Delete shipping zone',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                await shippingService.deleteZone(request.params.id);
                return reply.sendOk(null, 'Zone deleted successfully');
            },
        });

        // Methods
        app.post('/methods', {
            preHandler: [fastify.requirePermission('create', 'shipping')],
            schema: {
                tags: ['Admin | Shipping'],
                summary: 'Create shipping method',
                body: CreateShippingMethodSchema
            },
            handler: async (request, reply) => {
                const method = await shippingService.createMethod(request.body);
                return reply.sendCreated(method);
            },
        });

        app.put('/methods/:id', {
            preHandler: [fastify.requirePermission('update', 'shipping')],
            schema: {
                tags: ['Admin | Shipping'],
                summary: 'Update shipping method',
                params: IdParamSchema,
                body: UpdateShippingMethodSchema
            },
            handler: async (request, reply) => {
                const method = await shippingService.updateMethod(request.params.id, request.body);
                return reply.sendOk(method);
            },
        });

        app.delete('/methods/:id', {
            preHandler: [fastify.requirePermission('delete', 'shipping')],
            schema: {
                tags: ['Admin | Shipping'],
                summary: 'Delete shipping method',
                params: IdParamSchema
            },
            handler: async (request, reply) => {
                await shippingService.deleteMethod(request.params.id);
                return reply.sendOk(null, 'Method deleted successfully');
            },
        });
    }, { prefix: '/admin/shipping' });
};

export default shippingRoutes;

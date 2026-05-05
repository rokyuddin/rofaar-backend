import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { shippingService } from './service.js';
import {
    CreateShippingZoneSchema,
    CreateShippingMethodSchema,
    ShippingZoneResponseSchema,
} from './schema.js';
import { success } from '@/shared/response.js';
import { z } from 'zod';

const shippingRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.register(async (app) => {
        app.get('/', {
            schema: {
                response: { 200: z.object({ success: z.literal(true), data: z.array(ShippingZoneResponseSchema) }) },
            },
            handler: async () => {
                const zones = await shippingService.getZones();
                return success(zones);
            },
        });

        app.post('/zones', {
            onRequest: [fastify.authenticate, fastify.admin],
            schema: {
                body: CreateShippingZoneSchema,
                response: { 201: z.object({ success: z.literal(true), data: ShippingZoneResponseSchema }) },
            },
            handler: async (request, reply) => {
                const zone = await shippingService.createZone(request.body);
                return reply.code(201).send(success(zone));
            },
        });

        app.post('/methods', {
            onRequest: [fastify.authenticate, fastify.admin],
            schema: {
                body: CreateShippingMethodSchema,
                response: { 201: z.object({ success: z.literal(true), data: z.any() }) },
            },
            handler: async (request, reply) => {
                const method = await shippingService.createMethod(request.body);
                return reply.code(201).send(success(method));
            },
        });

        app.delete('/methods/:id', {
            onRequest: [fastify.authenticate, fastify.admin],
            schema: {
                params: z.object({ id: z.string().uuid() }),
                response: { 200: z.object({ success: z.literal(true), message: z.string() }) },
            },
            handler: async (request) => {
                await shippingService.deleteMethod(request.params.id);
                return success(null, 'Shipping method deleted');
            },
        });
    }, { prefix: '/shipping' });
};

export default shippingRoutes;

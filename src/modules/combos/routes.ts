import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { success } from '@/shared/response.js';
import { createSwaggerConfig } from '@/shared/swagger.js';

import { comboService } from './service.js';
import { CreateComboSchema, ComboResponseSchema } from './schema.js';

const combosRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.get('/combos', {
        schema: {
            response: { 200: z.object({ success: z.literal(true), data: z.array(ComboResponseSchema) }) },
        },
        handler: async () => {
            const result = await comboService.list();
            return success(result);
        },
    });

    f.post('/admin/combos', {
        onRequest: [fastify.authenticate, fastify.admin],
        schema: {
            body: CreateComboSchema,
            response: { 201: z.object({ success: z.literal(true), data: ComboResponseSchema }) },
        },
        handler: async (request, reply) => {
            const combo = await comboService.create(request.body);
            return reply.code(201).send(success(combo));
        },
    });
};

export default combosRoutes;

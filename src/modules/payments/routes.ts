import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { paymentService } from './service.js';
import { OnAirPaymentSchema } from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const paymentRoutes: FastifyPluginAsync = async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>();
    app.addHook('onRequest', fastify.authenticate);

    app.post('/orders/:id/pay', {
        schema: {
            tags: ['Payments'],
            summary: 'Submit payment details',
            params: IdParamSchema,
            body: OnAirPaymentSchema
        },
        handler: async (request, reply) => {
            const result = await paymentService.submitOnAirPayment(
                request.params.id,
                request.user.id,
                request.body
            );
            return reply.sendCreated(result, 'Payment submitted for verification');
        },
    });

    app.get('/orders/:id/payment', {
        schema: {
            tags: ['Payments'],
            summary: 'Get order payments',
            params: IdParamSchema
        },
        handler: async (request, reply) => {
            const records = await paymentService.getByOrder(request.params.id, request.user.id);
            return reply.sendOk(records);
        },
    });
};

export default paymentRoutes;

import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { paymentService } from './service.js';
import { OnAirPaymentSchema } from './schema.js';
import { IdParamSchema } from '@/shared/types.js';
import { success } from '@/shared/response.js';

const paymentsPlugin: FastifyPluginAsync = async (fastify) => {
    // ─── Customer Payment Routes ─────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        /**
         * Submit On Air (bKash/Nagad) payment details.
         * Requires transaction ID and phone number.
         * Admin will verify and mark as paid.
         * 
         * POST /orders/:id/pay
         */
        app.post('/:id/pay', {
            schema: { params: IdParamSchema, body: OnAirPaymentSchema },
            handler: async (request, reply) => {
                const result = await paymentService.submitOnAirPayment(
                    request.params.id,
                    request.user.id,
                    request.body
                );
                return reply.code(201).send(success(result, 'Payment submitted for verification'));
            },
        });

        /**
         * Get all payment records for an order.
         * GET /orders/:id/payment
         */
        app.get('/:id/payment', {
            schema: { params: IdParamSchema },
            handler: async (request) => {
                const records = await paymentService.getByOrder(request.params.id, request.user.id);
                return success(records);
            },
        });
    }, { prefix: '/orders' });
};

export default fp(paymentsPlugin, { name: 'payment-routes' });

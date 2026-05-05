import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { refundService } from './service.js';
import {
    RequestRefundSchema,
    ApproveRefundSchema,
    RejectRefundSchema,
    RefundResponseSchema,
} from './schema.js';
import { success } from '@/shared/response.js';
import { z } from 'zod';

const refundRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Customer Routes ─────────────────────────────────────────────────────
    f.register(async (app) => {
        app.addHook('onRequest', fastify.authenticate);

        app.post('/request', {
            schema: {
                body: RequestRefundSchema,
                response: { 201: z.object({ success: z.literal(true), data: RefundResponseSchema }) },
            },
            handler: async (request, reply) => {
                const refund = await refundService.requestRefund(request.user.id, request.body);
                return reply.code(201).send(success(refund));
            },
        });

        app.get('/', {
            schema: {
                response: { 200: z.object({ success: z.literal(true), data: z.array(RefundResponseSchema) }) },
            },
            handler: async (request) => {
                const refunds = await refundService.getByUserId(request.user.id);
                return success(refunds);
            },
        });
    }, { prefix: '/refunds' });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    f.register(async (app) => {
        app.addHook('onRequest', fastify.authenticate);
        // Assuming there's a requirement for admin check

        app.get('/', {
            onRequest: [fastify.admin],
            schema: {
                response: { 200: z.object({ success: z.literal(true), data: z.array(z.any()) }) },
            },
            handler: async () => {
                const refunds = await refundService.adminList();
                return success(refunds);
            },
        });

        app.patch('/:id/approve', {
            onRequest: [fastify.admin],
            schema: {
                params: z.object({ id: z.string().uuid() }),
                body: ApproveRefundSchema,
                response: { 200: z.object({ success: z.literal(true), data: RefundResponseSchema }) },
            },
            handler: async (request) => {
                const refund = await refundService.approveRefund(request.params.id, request.body.adminNote);
                return success(refund);
            },
        });

        app.patch('/:id/reject', {
            onRequest: [fastify.admin],
            schema: {
                params: z.object({ id: z.string().uuid() }),
                body: RejectRefundSchema,
                response: { 200: z.object({ success: z.literal(true), data: RefundResponseSchema }) },
            },
            handler: async (request) => {
                const refund = await refundService.rejectRefund(request.params.id, request.body.adminNote);
                return success(refund);
            },
        });
    }, { prefix: '/admin/refunds' });
};

export default refundRoutes;

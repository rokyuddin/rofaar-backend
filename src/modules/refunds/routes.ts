import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { refundService } from './service.js';
import { RequestRefundSchema, ApproveRefundSchema, RejectRefundSchema } from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const refundRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Customer Routes ───────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.post('/', {
            schema: {
                tags: ['Refunds'],
                summary: 'Request refund',
                body: RequestRefundSchema
            },
            handler: async (request, reply) => {
                const refund = await refundService.requestRefund(request.user.id, request.body);
                return reply.sendCreated(refund);
            },
        });

        app.get('/my', {
            schema: {
                tags: ['Refunds'],
                summary: 'List my refunds',
            },
            handler: async (request, reply) => {
                const refunds = await refundService.getByUserId(request.user.id);
                return reply.sendOk(refunds);
            },
        });
    }, { prefix: '/refunds' });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.get('/admin', {
            preHandler: [fastify.requirePermission('read', 'orders')],
            schema: {
                tags: ['Admin | Refunds'],
                summary: 'List refund requests',
            },
            handler: async (_request, reply) => {
                const refunds = await refundService.adminList();
                return reply.sendOk(refunds);
            },
        });

        app.patch('/:id/approve', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Refunds'],
                summary: 'Approve refund',
                params: IdParamSchema,
                body: ApproveRefundSchema
            },
            handler: async (request, reply) => {
                const refund = await refundService.approveRefund(request.params.id, request.body.adminNote);
                return reply.sendOk(refund);
            },
        });

        app.patch('/:id/reject', {
            preHandler: [fastify.requirePermission('update', 'orders')],
            schema: {
                tags: ['Admin | Refunds'],
                summary: 'Reject refund',
                params: IdParamSchema,
                body: RejectRefundSchema
            },
            handler: async (request, reply) => {
                const refund = await refundService.rejectRefund(request.params.id, request.body.adminNote);
                return reply.sendOk(refund);
            },
        });
    }, { prefix: '/admin/refunds' });
};

export default refundRoutes;

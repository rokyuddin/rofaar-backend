import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { contactService } from './service.js';
import { CreateContactSubmissionSchema, UpdateContactStatusSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';

const contactRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Public Routes ────────────────────────────────────────────────────────

    f.post('/contact', {
        schema: { body: CreateContactSubmissionSchema },
        handler: async (request, reply) => {
            const result = await contactService.create(request.body);
            return reply.code(201).send(success(result, 'Thank you for your message. We will get back to you soon.'));
        },
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────

    f.get('/admin/contacts', {
        preHandler: [fastify.requirePermission('read', 'contacts')],
        handler: async () => {
            const result = await contactService.list();
            return success(result);
        },
    });

    f.patch('/admin/contacts/:id/status', {
        preHandler: [fastify.requirePermission('update', 'contacts')],
        schema: { params: IdParamSchema, body: UpdateContactStatusSchema },
        handler: async (request) => {
            const result = await contactService.updateStatus(request.params.id, request.body.status);
            return success(result);
        },
    });

    f.delete('/admin/contacts/:id', {
        preHandler: [fastify.requirePermission('delete', 'contacts')],
        schema: { params: IdParamSchema },
        handler: async (request) => {
            await contactService.delete(request.params.id);
            return success(null, 'Submission deleted successfully');
        },
    });
};

export default fp(contactRoutes, { name: 'contact-routes' });

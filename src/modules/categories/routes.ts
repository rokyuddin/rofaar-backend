import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { categoryService } from './service.js';
import { CreateCategorySchema, UpdateCategorySchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema, SlugParamSchema } from '@/shared/types.js';

const categoryRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Public Routes ────────────────────────────────────────────────────────

    f.get('/categories', {
        handler: async () => {
            const result = await categoryService.list();
            return success(result);
        },
    });

    f.get('/categories/:slug', {
        schema: { params: SlugParamSchema },
        handler: async (request) => {
            const result = await categoryService.getBySlug(request.params.slug);
            return success(result);
        },
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);
    app.post('/', {
        preHandler: [fastify.requirePermission('create', 'categories')],
        schema: { body: CreateCategorySchema },
        handler: async (request, reply) => {
            const result = await categoryService.create(request.body);
            return reply.code(201).send(success(result));
        },
    });

    app.put('/:id', {
        preHandler: [fastify.requirePermission('update', 'categories')],
        schema: { params: IdParamSchema, body: UpdateCategorySchema },
        handler: async (request) => {
            const result = await categoryService.update(request.params.id, request.body);
            return success(result);
        },
    });

    app.delete('/:id', {
        preHandler: [fastify.requirePermission('delete', 'categories')],
        schema: { params: IdParamSchema },
        handler: async (request) => {
            await categoryService.delete(request.params.id);
            return success(null, 'Category deleted successfully');
        },
    });
    }, { prefix: '/admin/categories' });
};

export default fp(categoryRoutes, { name: 'category-routes' });

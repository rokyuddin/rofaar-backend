import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { catalogService } from './service.js';
import { success } from '@/shared/response.js';
import { createSwaggerConfig } from '@/shared/swagger.js';
import { SlugParamSchema } from '@/shared/types.js';
import { NotFoundError } from '@/shared/errors.js';
import {
    CreateCategorySchema,
    UpdateCategorySchema,
    DeleteCategorySchema,
    CreateTagSchema,
    UpdateTagSchema,
    DeleteTagSchema,
} from './schema.js';
import type {
    CreateCategoryBody,
    UpdateCategoryBody,
    DeleteCategoryBody,
    CreateTagBody,
    UpdateTagBody,
    DeleteTagBody,
} from './schema.js';
import type { z } from 'zod';

type SlugParams = z.infer<typeof SlugParamSchema>;

const catalogRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Public Routes ───────────────────────────────────────────────────────

    // Categories
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();

        app.get('/list', {
            schema: {
                ...createSwaggerConfig(['Categories'], 'List Categories', 'Get all product categories', false),
            },
            handler: async () => {
                const result = await catalogService.listCategories();
                return success(result);
            },
        });

        app.get('/:slug', {
            schema: {
                params: SlugParamSchema,
                ...createSwaggerConfig(['Categories'], 'Get Category', 'Get single category by slug', false),
            },
            handler: async (request) => {
                const params = request.params as SlugParams;
                const result = await catalogService.getCategoryBySlug(params.slug);
                if (!result) throw new NotFoundError('Category');
                return success(result);
            },
        });
    }, { prefix: '/categories' });

    // Tags
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();

        app.get('/list', {
            schema: {
                ...createSwaggerConfig(['Tags'], 'List Tags', 'Get all product tags', false),
            },
            handler: async () => {
                const result = await catalogService.listTags();
                return success(result);
            },
        });

        app.get('/:slug', {
            schema: {
                params: SlugParamSchema,
                ...createSwaggerConfig(['Tags'], 'Get Tag', 'Get single tag by slug', false),
            },
            handler: async (request) => {
                const params = request.params as SlugParams;
                const result = await catalogService.getTagBySlug(params.slug);
                if (!result) throw new NotFoundError('Tag');
                return success(result);
            },
        });
    }, { prefix: '/tags' });

    // ─── Admin Routes ────────────────────────────────────────────────────────

    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.adminOnly);

        // Admin Categories
        app.post('/categories/create', {
            schema: {
                body: CreateCategorySchema,
                ...createSwaggerConfig(['Admin | Categories'], 'Create Category', 'Create a new category', true),
            },
            handler: async (request, reply) => {
                const result = await catalogService.createCategory(request.body as CreateCategoryBody);
                return reply.code(201).send(success(result));
            },
        });

        app.put('/categories/update', {
            schema: {
                body: UpdateCategorySchema,
                ...createSwaggerConfig(['Admin | Categories'], 'Update Category', 'Update a category', true),
            },
            handler: async (request, reply) => {
                const result = await catalogService.updateCategory(request.body as UpdateCategoryBody);
                return reply.code(200).send(success(result));
            },
        });

        app.delete('/categories/delete', {
            schema: {
                body: DeleteCategorySchema,
                ...createSwaggerConfig(['Admin | Categories'], 'Delete Category', 'Delete a category', true),
            },
            handler: async (request, reply) => {
                const result = await catalogService.deleteCategory(request.body as DeleteCategoryBody);
                return reply.code(200).send(success(result));
            },
        });

        // Admin Tags
        app.post('/tags/create', {
            schema: {
                body: CreateTagSchema,
                ...createSwaggerConfig(['Admin | Tags'], 'Create Tag', 'Create a new tag', true),
            },
            handler: async (request, reply) => {
                const result = await catalogService.createTag(request.body as CreateTagBody);
                return reply.code(201).send(success(result));
            },
        });

        app.put('/tags/update', {
            schema: {
                body: UpdateTagSchema,
                ...createSwaggerConfig(['Admin | Tags'], 'Update Tag', 'Update a tag', true),
            },
            handler: async (request, reply) => {
                const result = await catalogService.updateTag(request.body as UpdateTagBody);
                return reply.code(200).send(success(result));
            },
        });

        app.delete('/tags/delete', {
            schema: {
                body: DeleteTagSchema,
                ...createSwaggerConfig(['Admin | Tags'], 'Delete Tag', 'Delete a tag', true),
            },
            handler: async (request, reply) => {
                const result = await catalogService.deleteTag(request.body as DeleteTagBody);
                return reply.code(200).send(success(result));
            },
        });
    }, { prefix: '/admin' });
};

export default catalogRoutes;

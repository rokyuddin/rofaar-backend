import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { userService } from './service.js';
import { UpdateProfileSchema } from './schema.js';

const userRoutes: FastifyPluginAsync = async (fastify) => {
    // ─── Protected Routes ───────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.patch('/profile', {
            schema: {
                tags: ['Profile'],
                summary: 'Update user profile',
                body: UpdateProfileSchema
            },
            handler: async (request, reply) => {
                const user = await userService.updateProfile(request.user.id, request.body);
                return reply.sendOk(user);
            },
        });

        app.delete('/account', {
            schema: {
                tags: ['Profile'],
                summary: 'Delete account',
            },
            handler: async (request, reply) => {
                await userService.deleteAccount(request.user.id);
                return reply.sendOk(null, 'Account deleted successfully');
            },
        });
    });

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        app.get('/admin', {
            preHandler: [fastify.requirePermission('read', 'users')],
            schema: {
                tags: ['Admin | Users'],
                summary: 'List users',
            },
            handler: async (_request, reply) => {
                const users = await userService.adminList();
                return reply.sendOk(users);
            },
        });
    }, { prefix: '/admin/users' });
};

export default userRoutes;

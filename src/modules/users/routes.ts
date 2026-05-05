import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { userService } from './service.js';
import { UpdateProfileSchema, UserResponseSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { z } from 'zod';

const userRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.register(async (app) => {
        app.addHook('onRequest', fastify.authenticate);

        app.patch('/profile', {
            schema: {
                body: UpdateProfileSchema,
                response: { 200: z.object({ success: z.literal(true), data: UserResponseSchema }) },
            },
            handler: async (request) => {
                const user = await userService.updateProfile(request.user.id, request.body);
                return success(user);
            },
        });

        app.delete('/account', {
            schema: {
                response: { 200: z.object({ success: z.literal(true), message: z.string() }) },
            },
            handler: async (request) => {
                await userService.deleteAccount(request.user.id);
                return success(null, 'Account deleted successfully');
            },
        });
    }, { prefix: '/users' });

    f.register(async (app) => {
        app.addHook('onRequest', fastify.authenticate);
        app.addHook('onRequest', fastify.admin);

        app.get('/', {
            schema: {
                response: { 200: z.object({ success: z.literal(true), data: z.array(z.any()) }) },
            },
            handler: async () => {
                const users = await userService.adminList();
                return success(users);
            },
        });
    }, { prefix: '/admin/users' });
};

export default userRoutes;

import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { authService } from './service.js';
import { RegisterBodySchema, LoginBodySchema, AuthResponseSchema, MeResponseSchema } from './schema.js';
import { success } from '@/shared/response.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // POST /auth/register
    f.post('/register', {
        schema: {
            body: RegisterBodySchema,
            response: { 201: AuthResponseSchema },
        },
        handler: async (request, reply) => {
            const user = await authService.register(request.body);
            const token = fastify.jwt.sign({ sub: user.id, role: user.role });

            return reply.code(201).send(
                success({
                    token,
                    user: { id: user.id, name: user.name, email: user.email, role: user.role }
                }),
            );
        },
    });

    // POST /auth/login
    f.post('/login', {
        schema: {
            body: LoginBodySchema,
            response: { 200: AuthResponseSchema },
        },
        handler: async (request, reply) => {
            const user = await authService.login(request.body);
            const token = fastify.jwt.sign({ sub: user.id, role: user.role });

            return reply.send(
                success({
                    token,
                    user: { id: user.id, name: user.name, email: user.email, role: user.role }
                }),
            );
        },
    });

    // GET /auth/me
    f.get('/me', {
        onRequest: [fastify.authenticate],
        schema: {
            response: { 200: MeResponseSchema },
        },
        handler: async (request) => {
            const user = await authService.getMe(request.user.id);
            return success(user);
        },
    });
};

export default fp(authRoutes, { name: 'auth-routes' });

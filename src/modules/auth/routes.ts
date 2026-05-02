import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { customerAuthService, operatorAuthService, sharedAuthService } from './service.js';
import {
    CustomerRegisterBodySchema, CustomerVerifyOtpBodySchema, CustomerLoginBodySchema,
    CustomerForgotPasswordBodySchema, CustomerResetPasswordBodySchema, CustomerChangePasswordBodySchema,
    AuthResponseSchema, OperatorLoginBodySchema, OperatorAuthResponseSchema,
    MeResponseSchema, GenericMessageResponseSchema
} from './schema.js';
import { success } from '@/shared/response.js';
import { createSwaggerConfig } from '@/shared/swagger.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
    console.log('Registering authRoutes, authenticate exists:', !!fastify.authenticate);
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // POST /auth/register
    f.post('/register', {
        schema: {
            body: RegisterBodySchema,
            response: { 201: AuthResponseSchema },
        },
        handler: async (request, reply) => {
            const user = await authService.register(request.body);
            const token = fastify.jwt.sign({ sub: user.id });

            return reply.code(201).send(
                success({
                    token,
                    user: { id: user.id, name: user.name, email: user.email, role: user.role },
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
            const token = fastify.jwt.sign({ sub: user.id });

            return reply.send(
                success({
                    token,
                    user: { id: user.id, name: user.name, email: user.email, role: user.role },
                }),
            );

        },
    });

    // GET /auth/me  (requires auth)
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

export default authRoutes;

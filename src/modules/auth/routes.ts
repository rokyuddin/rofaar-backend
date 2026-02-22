import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { customerAuthService, operatorAuthService, sharedAuthService } from './service.js';
import {
    CustomerRegisterBodySchema, CustomerVerifyOtpBodySchema, CustomerLoginBodySchema,
    CustomerForgotPasswordBodySchema, CustomerResetPasswordBodySchema, CustomerChangePasswordBodySchema,
    AuthResponseSchema, OperatorLoginBodySchema, OperatorAuthResponseSchema,
    MeResponseSchema, GenericMessageResponseSchema
} from './schema.js';
import { success } from '@/shared/response.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Customer Routes ────────────────────────────────────────────────────────
    f.register(async (fastifyInstance) => {
        const app = fastifyInstance.withTypeProvider<ZodTypeProvider>();

        // POST /auth/customer/register
        app.post('/register', {
            schema: {
                body: CustomerRegisterBodySchema,
                response: { 201: GenericMessageResponseSchema },
            },
            handler: async (request, reply) => {
                await customerAuthService.register(request.body);
                return reply.code(201).send(success({ message: 'OTP sent to phone number' }));
            },
        });

        // POST /auth/customer/verify-otp
        app.post('/verify-otp', {
            schema: {
                body: CustomerVerifyOtpBodySchema,
                response: { 200: AuthResponseSchema },
            },
            handler: async (request, reply) => {
                const user = await customerAuthService.verifyOtp(request.body.phone, request.body.otp);
                const token = fastify.jwt.sign({ sub: user.id, role: user.role });
                return reply.send(success({
                    message: 'Registration successful',
                    token,
                    user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, status: user.status }
                }));
            },
        });

        // POST /auth/customer/login
        app.post('/login', {
            schema: {
                body: CustomerLoginBodySchema,
                response: { 200: AuthResponseSchema },
            },
            handler: async (request, reply) => {
                const user = await customerAuthService.login(request.body);
                const token = fastify.jwt.sign({ sub: user.id, role: user.role });
                return reply.send(success({
                    token,
                    user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, status: user.status }
                }));
            },
        });

        // POST /auth/customer/forgot-password
        app.post('/forgot-password', {
            schema: {
                body: CustomerForgotPasswordBodySchema,
                response: { 200: GenericMessageResponseSchema },
            },
            handler: async (request, reply) => {
                await customerAuthService.forgotPassword(request.body.phone);
                return reply.send(success({ message: 'OTP sent to phone number' }));
            },
        });

        // POST /auth/customer/reset-password
        app.post('/reset-password', {
            schema: {
                body: CustomerResetPasswordBodySchema,
                response: { 200: GenericMessageResponseSchema },
            },
            handler: async (request, reply) => {
                await customerAuthService.resetPassword(request.body);
                return reply.send(success({ message: 'Password updated successfully' }));
            },
        });

        // POST /auth/customer/change-password (Requires Auth)
        app.post('/change-password', {
            onRequest: [fastify.authenticate],
            schema: {
                body: CustomerChangePasswordBodySchema,
                response: { 200: GenericMessageResponseSchema },
            },
            handler: async (request, reply) => {
                await customerAuthService.changePassword(request.user.id, request.body);
                return reply.send(success({ message: 'Password changed successfully' }));
            },
        });

        // GET /auth/customer/me
        app.get('/me', {
            onRequest: [fastify.authenticate],
            schema: {
                response: { 200: MeResponseSchema },
            },
            handler: async (request) => {
                const user = await sharedAuthService.getMe(request.user.id);
                return success(user);
            },
        });

    }, { prefix: '/customer' });

    // ─── Operator Routes ────────────────────────────────────────────────────────
    f.register(async (fastifyInstance) => {
        const app = fastifyInstance.withTypeProvider<ZodTypeProvider>();

        // POST /auth/operator/login
        app.post('/login', {
            schema: {
                body: OperatorLoginBodySchema,
                response: { 200: OperatorAuthResponseSchema },
            },
            handler: async (request, reply) => {
                const user = await operatorAuthService.login(request.body);
                const token = fastify.jwt.sign({ sub: user.id, role: user.role });
                return reply.send(success({
                    token,
                    operator: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status }
                }));
            },
        });

        // GET /auth/operator/me
        app.get('/me', {
            onRequest: [fastify.authenticate],
            schema: {
                response: { 200: MeResponseSchema },
            },
            handler: async (request) => {
                const user = await sharedAuthService.getMe(request.user.id);
                return success(user);
            },
        });

    }, { prefix: '/operator' });

};

export default fp(authRoutes, { name: 'auth-routes' });

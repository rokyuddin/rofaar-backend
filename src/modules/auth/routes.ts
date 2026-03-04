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


    // ─── Customer Routes ────────────────────────────────────────────────────────
    f.register(async (fastifyInstance) => {
        const app = fastifyInstance.withTypeProvider<ZodTypeProvider>();

        // POST /auth/customer/register
        app.post('/register', {
            schema: {
                ...createSwaggerConfig(['Authentication'], 'Register Customer', 'Register a new customer account with phone number'),
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
                ...createSwaggerConfig(['Authentication'], 'Verify OTP', 'Verify OTP code sent during registration'),
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
                ...createSwaggerConfig(['Authentication'], 'Customer Login', 'Login customer with phone and password'),
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
                ...createSwaggerConfig(['Authentication'], 'Forgot Password', 'Send OTP for password reset'),
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
                ...createSwaggerConfig(['Authentication'], 'Reset Password', 'Reset password using OTP verification'),
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
                ...createSwaggerConfig(['Authentication'], 'Change Password', 'Change password while logged in', true),
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
                ...createSwaggerConfig(['Authentication'], 'Get Current Customer', 'Get authenticated customer profile', true),
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
                ...createSwaggerConfig(['Authentication'], 'Operator Login', 'Login operator with email and password'),
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
                ...createSwaggerConfig(['Authentication'], 'Get Current Operator', 'Get authenticated operator profile', true),
                response: { 200: MeResponseSchema },
            },
            handler: async (request) => {
                const user = await sharedAuthService.getMe(request.user.id);
                return success(user);
            },
        });

    }, { prefix: '/operator' });

};

export default authRoutes;

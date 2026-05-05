import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { authService } from './service.js';
import {
    RequestOtpBodySchema,
    VerifyOtpBodySchema,
    CompleteRegistrationBodySchema,
    LoginBodySchema,
    AdminLoginBodySchema,
    ForgotPasswordBodySchema,
    VerifyResetOtpBodySchema,
    ResetPasswordWithTokenSchema,
    ChangePasswordBodySchema,
    AuthResponseSchema,
    MeResponseSchema
} from './schema.js';
import { success } from '@/shared/response.js';
import { z } from 'zod';

const authRoutes: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // ─── Registration ─────────────────────────────────────────────────────────

    f.post('/register/send-otp', {
        schema: {
            body: RequestOtpBodySchema,
            response: { 200: z.object({ success: z.literal(true), message: z.string() }) },
        },
        handler: async (request) => {
            await authService.sendRegistrationOtp(request.body.phone);
            return success(null, 'OTP sent successfully');
        },
    });

    f.post('/register/verify-otp', {
        schema: {
            body: VerifyOtpBodySchema,
            response: { 200: z.object({ success: z.literal(true), data: z.object({ token: z.string() }) }) },
        },
        handler: async (request) => {
            const token = await authService.verifyRegistrationOtp(request.body.phone, request.body.otp);
            return success({ token });
        },
    });

    f.post('/register/complete', {
        schema: {
            body: CompleteRegistrationBodySchema,
            response: { 201: AuthResponseSchema },
        },
        handler: async (request, reply) => {
            const user = await authService.completeRegistration(request.body.token, request.body);
            const token = fastify.jwt.sign({ sub: user.id });

            return reply.code(201).send(
                success({
                    token,
                    user: { 
                        id: user.id, 
                        name: user.name, 
                        email: user.email, 
                        role: user.role 
                    },
                }),
            );
        },
    });

    // ─── Authentication ───────────────────────────────────────────────────────

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
                    user: { 
                        id: user.id, 
                        name: user.name, 
                        email: user.email, 
                        role: user.role 
                    },
                }),
            );
        },
    });

    f.post('/admin/login', {
        schema: {
            body: AdminLoginBodySchema,
            response: { 200: AuthResponseSchema },
        },
        handler: async (request, reply) => {
            const user = await authService.adminLogin(request.body);
            const token = fastify.jwt.sign({ sub: user.id });

            return reply.send(
                success({
                    token,
                    user: { 
                        id: user.id, 
                        name: user.name, 
                        email: user.email, 
                        role: user.role 
                    },
                }),
            );
        },
    });

    // ─── Forgot/Reset Password (Public) ───────────────────────────────────────

    f.post('/forgot-password', {
        schema: {
            body: ForgotPasswordBodySchema,
            response: { 200: z.object({ success: z.literal(true), message: z.string().optional(), data: z.null() }) },
        },
        handler: async (request) => {
            await authService.forgotPassword(request.body.phone);
            return success(null, 'If an account exists, a password reset OTP has been sent.');
        },
    });

    f.post('/verify-otp', {
        schema: {
            body: VerifyResetOtpBodySchema,
            response: { 200: z.object({ success: z.literal(true), data: z.object({ resetToken: z.string() }), message: z.string().optional() }) },
        },
        handler: async (request) => {
            const resetToken = await authService.verifyResetOtp(request.body.phone, request.body.otp);
            return success({ resetToken });
        },
    });

    f.post('/reset-password', {
        schema: {
            body: ResetPasswordWithTokenSchema,
            response: { 200: z.object({ success: z.literal(true), message: z.string().optional(), data: z.null() }) },
        },
        handler: async (request) => {
            await authService.resetPasswordWithToken(request.body.resetToken, request.body.newPassword);
            return success(null, 'Password has been reset successfully.');
        },
    });

    // ─── Protected Routes ─────────────────────────────────────────────────────

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

    f.post('/change-password', {
        onRequest: [fastify.authenticate],
        schema: {
            body: ChangePasswordBodySchema,
            response: { 200: z.object({ success: z.literal(true), message: z.string().optional(), data: z.null() }) },
        },
        handler: async (request) => {
            await authService.changePassword(request.user.id, request.body);
            return success(null, 'Password changed successfully.');
        },
    });

};

export default authRoutes;

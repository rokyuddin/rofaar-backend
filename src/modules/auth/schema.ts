
import { z } from 'zod';

// ─── Customer Auth Schemas ──────────────────────────────────────────────────

export const CustomerRegisterBodySchema = z.object({
    name: z.string().min(2).max(120),
    phone: z.string().min(10).max(20),
    password: z.string().min(6), // using length requirements from standard practices
});

export const CustomerVerifyOtpBodySchema = z.object({
    phone: z.string(),
    otp: z.string().length(4),
});

export const CustomerLoginBodySchema = z.object({
    phone: z.string(),
    password: z.string().min(6),
});

export const CustomerForgotPasswordBodySchema = z.object({
    phone: z.string(),
});

export const CustomerResetPasswordBodySchema = z.object({
    phone: z.string(),
    otp: z.string().length(4),
    newPassword: z.string().min(6),
});

export const CustomerChangePasswordBodySchema = z.object({
    oldPassword: z.string(),
    newPassword: z.string().min(6),
});

export const AuthResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        token: z.string().optional(),
        message: z.string().optional(),
        user: z.object({
            id: z.string().uuid(),
            name: z.string(),
            phone: z.string(),
            email: z.string().nullable(),
            role: z.string(),
            status: z.string(),
        }).optional(),
    }),
});

// ─── Operator Auth Schemas ──────────────────────────────────────────────────

export const OperatorLoginBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const OperatorAuthResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        token: z.string(),
        operator: z.object({
            id: z.string().uuid(),
            name: z.string(),
            email: z.string().nullable(),
            role: z.string(),
            status: z.string(),
        }),
    }),
});

// ─── Standard Auth Me Response ──────────────────────────────────────────────

export const MeResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        id: z.string().uuid(),
        name: z.string(),
        phone: z.string().nullable(),
        email: z.string().nullable(),
        role: z.string(),
        status: z.string(),
    }),
});

export const GenericMessageResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        message: z.string(),
    }),
});

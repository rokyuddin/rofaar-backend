import { z } from 'zod';

// ─── Auth Schemas ────────────────────────────────────────────────────────────

// Step 1: Request OTP
export const RequestOtpBodySchema = z.object({
    phone: z.string().min(10).max(20),
});

// Step 2: Verify OTP
export const VerifyOtpBodySchema = z.object({
    phone: z.string().min(10).max(20),
    otp: z.string().length(6),
});

// Step 3: Complete Registration (with profile info)
export const CompleteRegistrationBodySchema = z.object({
    token: z.string(),
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8),
});

// Login
export const LoginBodySchema = z.object({
    phone: z.string().min(10).max(20),
    password: z.string().min(1),
});

export const AdminLoginBodySchema = LoginBodySchema;

// ─── Password Reset Flow ─────────────────────────────────────────────────────

export const ForgotPasswordBodySchema = z.object({
    phone: z.string().min(10).max(20),
});

export const VerifyResetOtpBodySchema = z.object({
    phone: z.string().min(10).max(20),
    otp: z.string().length(6),
});

export const ResetPasswordWithTokenSchema = z.object({
    resetToken: z.string().min(1),
    newPassword: z.string().min(8),
});

// ─── Authenticated Password Change ───────────────────────────────────────────

export const ChangePasswordBodySchema = z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(8),
});

// ─── Response Schemas ────────────────────────────────────────────────────────

export const AuthResponseSchema = z.object({
    success: z.literal(true),
    message: z.string().optional(),
    data: z.object({
        token: z.string(),
        user: z.object({
            id: z.string(),
            name: z.string().nullable(),
            email: z.string().nullable(),
            role: z.string(),
        }),
    }),
});

export const MeResponseSchema = z.object({
    success: z.literal(true),
    message: z.string().optional(),
    data: z.object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string().nullable(),
        role: z.string(),
        isVerified: z.boolean(),
        createdAt: z.string(),
    }),
});

import { z } from 'zod';

export const RegisterBodySchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8),
});

export const LoginBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const AuthResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        token: z.string(),
        user: z.object({
            id: z.string().uuid(),
            name: z.string(),
            email: z.string(),
            role: z.enum(['admin', 'customer']),
        }),
    }),
});

export const MeResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string(),
        role: z.enum(['admin', 'customer']),
    }),
});

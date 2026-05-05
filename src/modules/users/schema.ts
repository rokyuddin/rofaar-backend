import { z } from 'zod';

export const UpdateProfileSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    avatar: z.string().url().optional(),
});

export const UserResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    phone: z.string(),
    email: z.string().nullable(),
    avatar: z.string().nullable(),
    role: z.string(),
    createdAt: z.date(),
});

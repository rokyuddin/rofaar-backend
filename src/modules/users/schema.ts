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

export const AdminUpdateUserSchema = z.object({
    name: z
        .string()
        .min(2, { message: 'Name must be at least 2 characters' })
        .max(255, { message: 'Name must be 255 characters or less' })
        .optional(),
    email: z
        .string()
        .email({ message: 'Invalid email address' })
        .optional(),
    avatar: z
        .string()
        .url({ message: 'Invalid URL' })
        .optional()
        .or(z.literal('')),
    roleId: z
        .string()
        .uuid({ message: 'Invalid role ID' })
        .optional(),
    isActive: z.boolean().optional(),
    isVerified: z.boolean().optional(),
});

export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserSchema>;

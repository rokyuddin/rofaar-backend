import { z } from 'zod';

export const ContactSubmissionSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    subject: z.string().nullable(),
    message: z.string(),
    status: z.enum(['pending', 'read', 'resolved']),
    createdAt: z.date(),
});

export const CreateContactSubmissionSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    subject: z.string().optional(),
    message: z.string().min(1),
});

export const UpdateContactStatusSchema = z.object({
    status: z.enum(['pending', 'read', 'resolved']),
});

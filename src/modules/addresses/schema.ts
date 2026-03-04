import { z } from 'zod';

export const CreateAddressSchema = z.object({
    label: z.string().min(1).max(50).default('Home'),
    name: z.string().min(1).max(255),
    phone: z.string().min(1).max(20),
    altPhone: z.string().max(20).optional(),
    city: z.string().min(1).max(100),
    area: z.string().min(1).max(100), // upozila
    zone: z.string().max(100).optional(), // iunion
    address: z.string().min(1).max(500),
    isDefault: z.boolean().default(false),
});

export const UpdateAddressSchema = CreateAddressSchema.partial().extend({
    id: z.string().uuid(),
});

export const DeleteAddressSchema = z.object({
    id: z.string().uuid(),
});

export type CreateAddressBody = z.infer<typeof CreateAddressSchema>;
export type UpdateAddressBody = z.infer<typeof UpdateAddressSchema>;
export type DeleteAddressBody = z.infer<typeof DeleteAddressSchema>;

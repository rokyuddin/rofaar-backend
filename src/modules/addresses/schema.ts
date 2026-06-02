import { z } from 'zod';

export const AddressSchema = z.object({
    id: z.string().uuid(),
    label: z.string(),
    recipientName: z.string(),
    phone: z.string(),
    altPhone: z.string().nullable().optional(),
    address: z.string(),
    city: z.string(),
    area: z.string(),
    zone: z.string().nullable().optional(),
    isDefault: z.boolean(),
});

export const CreateAddressSchema = z.object({
    label: z.string().min(1).default('Home'),
    recipientName: z.string().min(1),
    phone: z.string().min(1),
    altPhone: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    area: z.string().min(1),
    zone: z.string().optional(),
    isDefault: z.boolean().default(false),
});

export const UpdateAddressSchema = CreateAddressSchema.partial();

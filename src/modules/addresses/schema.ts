import { z } from 'zod';

export const AddressSchema = z.object({
    id: z.string().uuid(),
    label: z.string(),
    recipientName: z.string(),
    phone: z.string(),
    addressLine: z.string(),
    city: z.string(),
    district: z.string(),
    postalCode: z.string().nullable(),
    isDefault: z.boolean(),
});

export const CreateAddressSchema = z.object({
    label: z.string().min(1).default('Home'),
    recipientName: z.string().min(1),
    phone: z.string().min(1),
    addressLine: z.string().min(1),
    city: z.string().min(1),
    district: z.string().min(1),
    postalCode: z.string().optional(),
    isDefault: z.boolean().default(false),
});

export const UpdateAddressSchema = CreateAddressSchema.partial();

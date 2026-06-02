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
    label: z
        .string()
        .min(1, { message: 'Label is required' })
        .max(50, { message: 'Label must be 50 characters or less' })
        .default('Home'),
    recipientName: z
        .string()
        .min(1, { message: 'Recipient name is required' })
        .max(255, { message: 'Recipient name must be 255 characters or less' }),
    phone: z
        .string()
        .min(1, { message: 'Phone number is required' })
        .regex(/^\d+$/, { message: 'Phone number must contain only digits' })
        .regex(/^01/, { message: 'Phone number must start with 01' })
        .length(11, { message: 'Phone number must be exactly 11 digits' }),
    altPhone: z
        .string()
        .regex(/^\d*$/, { message: 'Phone number must contain only digits' })
        .regex(/^01/, { message: 'Phone number must start with 01' })
        .length(11, { message: 'Phone number must be exactly 11 digits' })
        .optional()
        .or(z.literal('')),
    address: z
        .string()
        .min(1, { message: 'Address is required' })
        .max(500, { message: 'Address must be 500 characters or less' }),
    city: z
        .string()
        .min(1, { message: 'City is required' })
        .max(100, { message: 'City must be 100 characters or less' }),
    area: z
        .string()
        .min(1, { message: 'Area is required' })
        .max(100, { message: 'Area must be 100 characters or less' }),
    zone: z
        .string()
        .max(100, { message: 'Zone must be 100 characters or less' })
        .optional(),
    isDefault: z.boolean().default(false),
});

export const UpdateAddressSchema = CreateAddressSchema.partial();

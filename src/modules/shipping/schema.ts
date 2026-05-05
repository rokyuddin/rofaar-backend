import { z } from 'zod';

export const CreateShippingZoneSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
});

export const UpdateShippingZoneSchema = CreateShippingZoneSchema.partial();

export const CreateShippingMethodSchema = z.object({
    zoneId: z.string().uuid(),
    name: z.string().min(1),
    cost: z.number().min(0),
    estimatedDays: z.string().optional(),
});

export const UpdateShippingMethodSchema = CreateShippingMethodSchema.partial();

export const ShippingZoneResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    methods: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        cost: z.string(),
        estimatedDays: z.string().nullable(),
        isActive: z.boolean(),
    })).optional(),
});

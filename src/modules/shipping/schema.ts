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

export const UpdateShippingMethodSchema = CreateShippingMethodSchema.partial().extend({
    isActive: z.boolean().optional(),
});

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

export type CreateShippingZone = z.infer<typeof CreateShippingZoneSchema>;
export type UpdateShippingZone = z.infer<typeof UpdateShippingZoneSchema>;
export type CreateShippingMethod = z.infer<typeof CreateShippingMethodSchema>;
export type UpdateShippingMethod = z.infer<typeof UpdateShippingMethodSchema>;
export type ShippingZoneResponse = z.infer<typeof ShippingZoneResponseSchema>;

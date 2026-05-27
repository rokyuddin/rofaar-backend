import { z } from 'zod';

export const getSalesChartSchema = z.object({
    period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
});

export type GetSalesChartInput = z.infer<typeof getSalesChartSchema>;

export const getTopSellingSchema = z.object({
    limit: z.coerce.number().min(1).max(50).default(10),
});

export type GetTopSellingInput = z.infer<typeof getTopSellingSchema>;

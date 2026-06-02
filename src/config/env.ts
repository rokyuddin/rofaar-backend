import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('7d'),
    ENABLE_SWAGGER: z.string().optional().default('true'),
    API_HOST: z.string().optional().default('localhost:3000'),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional().default(''),

    // Steadfast Courier
    STEADFAST_API_KEY: z.string().optional(),
    STEADFAST_SECRET_KEY: z.string().optional(),
    STEADFAST_BASE_URL: z.string().url().default('https://portal.packzy.com/api/v1'),
    STEADFAST_WEBHOOK_TOKEN: z.string().optional(),
    STEADFAST_CALLBACK_URL: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;

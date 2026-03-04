import { z } from 'zod';
import type { FastifySchema } from 'fastify';


/**
 * Transform route schema to include Swagger tags and security
 */
export function createSwaggerConfig(
    tags: string[],
    summary?: string,
    description?: string,
    requireAuth: boolean = true
): Partial<FastifySchema> {
    const config: Partial<FastifySchema> = {
        tags,
    };

    if (summary) config.summary = summary;
    if (description) config.description = description;

    // Note: Security is handled globally in swagger plugin
    // Individual routes can override by setting security: []

    return config;
}

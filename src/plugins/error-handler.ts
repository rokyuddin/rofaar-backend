import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '@/shared/errors.js';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.setErrorHandler((error, request, reply) => {
        request.log.error({ err: error, url: request.url }, 'Request error');

        // Custom app errors
        if (error instanceof AppError) {
            return reply.code(error.statusCode).send({
                success: false,
                code: error.code,
                message: error.message,
            });
        }

        // Zod validation errors
        if (error instanceof ZodError) {
            return reply.code(400).send({
                success: false,
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                errors: error.flatten().fieldErrors,
            });
        }

        // Fastify's own 4xx errors (e.g. schema validation, 404)
        const fastifyError = error as FastifyError;
        if (fastifyError.statusCode != null && fastifyError.statusCode < 500) {
            return reply.code(fastifyError.statusCode).send({
                success: false,
                code: 'REQUEST_ERROR',
                message: fastifyError.message,
            });
        }

        // Unknown 500 — don't leak internals
        return reply.code(500).send({
            success: false,
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
        });
    });

    // 404 handler
    fastify.setNotFoundHandler((request, reply) => {
        reply.code(404).send({
            success: false,
            code: 'NOT_FOUND',
            message: `Route ${request.method} ${request.url} not found`,
        });
    });
};

export default fp(errorHandlerPlugin, { name: 'error-handler' });

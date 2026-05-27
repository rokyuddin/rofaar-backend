import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '@/shared/errors.js';
import { apiError } from '@/shared/response.js';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.setErrorHandler((error, request, reply) => {
        request.log.error({ err: error, url: request.url }, 'Request error');

        if (error instanceof AppError) {
            return reply.code(error.statusCode).send(apiError(error.code, error.message));
        }

        if (error instanceof ZodError) {
            return reply.code(400).send(
                apiError('VALIDATION_ERROR', 'Validation failed', error.flatten().fieldErrors),
            );
        }

        const fastifyError = error as FastifyError;
        if (fastifyError.statusCode != null && fastifyError.statusCode < 500) {
            return reply.code(fastifyError.statusCode).send(
                apiError('REQUEST_ERROR', fastifyError.message),
            );
        }

        return reply.code(500).send(
            apiError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred'),
        );
    });

    fastify.setNotFoundHandler((request, reply) => {
        reply.code(404).send(
            apiError('NOT_FOUND', `Route ${request.method} ${request.url} not found`),
        );
    });
};

export default fp(errorHandlerPlugin, { name: 'error-handler' });

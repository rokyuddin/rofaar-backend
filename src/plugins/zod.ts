import fp from 'fastify-plugin';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { FastifyPluginAsync } from 'fastify';

const zodPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.setValidatorCompiler(validatorCompiler);
    fastify.setSerializerCompiler(serializerCompiler);
};

export default fp(zodPlugin, { name: 'zod-provider' });

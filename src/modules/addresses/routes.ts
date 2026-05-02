import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { addressService } from './service.js';
import { CreateAddressSchema, UpdateAddressSchema } from './schema.js';
import { success } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';

const addressesPlugin: FastifyPluginAsync = async (fastify) => {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    f.addHook('onRequest', fastify.authenticate);

    f.get('/addresses', {
        handler: async (request) => {
            const result = await addressService.list(request.user.id);
            return success(result);
        },
    });

    f.post('/addresses', {
        schema: { body: CreateAddressSchema },
        handler: async (request, reply) => {
            const result = await addressService.create(request.user.id, request.body);
            return reply.code(201).send(success(result));
        },
    });

    f.put('/addresses/:id', {
        schema: { params: IdParamSchema, body: UpdateAddressSchema },
        handler: async (request) => {
            const result = await addressService.update(request.user.id, request.params.id, request.body);
            return success(result);
        },
    });

    f.delete('/addresses/:id', {
        schema: { params: IdParamSchema },
        handler: async (request) => {
            await addressService.delete(request.user.id, request.params.id);
            return success(null, 'Address deleted successfully');
        },
    });
};

export default fp(addressesPlugin, { name: 'addresses-routes' });

import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { addressService } from './service.js';
import { success } from '@/shared/response.js';
import { createSwaggerConfig } from '@/shared/swagger.js';
import { CreateAddressSchema, UpdateAddressSchema, DeleteAddressSchema } from './schema.js';
import type { CreateAddressBody, UpdateAddressBody, DeleteAddressBody } from './schema.js';

const addressesPlugin: FastifyPluginAsync = async (fastify) => {
    // ─── Authenticated User Routes ───────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        // GET /addresses/list
        app.get('/list', {
            schema: {
                ...createSwaggerConfig(['User | Addresses'], 'List Addresses', 'Get current user\'s saved addresses', true),
            },
            handler: async (request) => {
                const result = await addressService.list(request.user.id);
                return success(result);
            },
        });

        // POST /addresses/create
        app.post('/create', {
            schema: {
                body: CreateAddressSchema,
                ...createSwaggerConfig(['User | Addresses'], 'Create Address', 'Add a new address', true),
            },
            handler: async (request, reply) => {
                const result = await addressService.create(request.user.id, request.body as CreateAddressBody);
                return reply.code(201).send(success(result));
            },
        });

        // PUT /addresses/update
        app.put('/update', {
            schema: {
                body: UpdateAddressSchema,
                ...createSwaggerConfig(['User | Addresses'], 'Update Address', 'Update an existing address', true),
            },
            handler: async (request) => {
                const result = await addressService.update(request.user.id, request.body as UpdateAddressBody);
                return success(result);
            },
        });

        // DELETE /addresses/delete
        app.delete('/delete', {
            schema: {
                body: DeleteAddressSchema,
                ...createSwaggerConfig(['User | Addresses'], 'Delete Address', 'Remove an address', true),
            },
            handler: async (request) => {
                const { id } = request.body as DeleteAddressBody;
                await addressService.delete(request.user.id, id);
                return success(null, 'Address deleted');
            },
        });
    }, { prefix: '/addresses' });
};

export default addressesPlugin;

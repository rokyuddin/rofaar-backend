import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { addressService } from './service.js';
import { CreateAddressSchema, UpdateAddressSchema } from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const addressRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();
      app.addHook("onRequest", fastify.authenticate);

      app.get("/", {
        schema: {
          tags: ["Addresses"],
          summary: "List addresses",
        },
        handler: async (request, reply) => {
          const addresses = await addressService.list(request.user.id);
          return reply.sendOk(addresses);
        },
      });

      app.post("/", {
        schema: {
          tags: ["Addresses"],
          summary: "Create address",
          body: CreateAddressSchema,
        },
        handler: async (request, reply) => {
          const address = await addressService.create(
            request.user.id,
            request.body,
          );
          return reply.sendCreated(address);
        },
      });

      app.put("/:id", {
        schema: {
          tags: ["Addresses"],
          summary: "Update address",
          params: IdParamSchema,
          body: UpdateAddressSchema,
        },
        handler: async (request, reply) => {
          const address = await addressService.update(
            request.user.id,
            request.params.id,
            request.body,
          );
          return reply.sendOk(address);
        },
      });

      app.delete("/:id", {
        schema: {
          tags: ["Addresses"],
          summary: "Delete address",
          params: IdParamSchema,
        },
        handler: async (request, reply) => {
          await addressService.delete(request.user.id, request.params.id);
          return reply.sendOk(null, "Address deleted successfully");
        },
      });
    },
    { prefix: "/addresses" },
  );
};

export default addressRoutes;

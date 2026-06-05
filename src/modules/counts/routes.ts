import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { countsService } from './service.js';

const countsRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();

        app.get('/', {
            schema: {
                tags: ['Counts'],
                summary: 'Get cart and wishlist counts',
                description:
                    'Returns the cart and wishlist item counts for the authenticated user. Returns 0 for both if no valid token is provided.',
            },
            onRequest: [
                async (request: FastifyRequest, _reply: FastifyReply) => {
                    try {
                        const payload = await request.jwtVerify<{ sub: string }>();
                        request.user = { id: payload.sub };
                    } catch {
                        // No valid token — user stays unauthenticated
                    }
                },
            ],
            handler: async (request, reply) => {
                const userId = (request.user as { id?: string } | undefined)?.id;

                if (!userId) {
                    return reply.sendOk({ cart: 0, wishlist: 0 });
                }

                const counts = await countsService.getCounts(userId);
                return reply.sendOk(counts);
            },
        });
    }, { prefix: '/counts' });
};

export default countsRoutes;

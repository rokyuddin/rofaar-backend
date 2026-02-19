import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '@/config/env.js';
import { UnauthorizedError, ForbiddenError } from '@/shared/errors.js';

// ─── Type augmentation ────────────────────────────────────────────────────────

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: { sub: string; role: 'admin' | 'customer' };
        user: { id: string; role: 'admin' | 'customer' };
    }
}

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
        adminOnly: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const authPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: env.JWT_EXPIRES_IN },
    });

    fastify.decorate(
        'authenticate',
        async (request: FastifyRequest, _reply: FastifyReply) => {
            try {
                const payload = await request.jwtVerify<{ sub: string; role: 'admin' | 'customer' }>();
                request.user = { id: payload.sub, role: payload.role };
            } catch {
                throw new UnauthorizedError();
            }
        },
    );

    fastify.decorate(
        'adminOnly',
        async (request: FastifyRequest, reply: FastifyReply) => {
            await fastify.authenticate(request, reply);
            if (request.user.role !== 'admin') {
                throw new ForbiddenError('Admin access required');
            }
        },
    );
};

export default fp(authPlugin, { name: 'auth' });

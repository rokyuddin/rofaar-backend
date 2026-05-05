import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '@/config/env.js';
import { UnauthorizedError, ForbiddenError } from '@/shared/errors.js';
import { permissionService, type Action, type Resource, type UserPermissions } from '@/shared/permission.service.js';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

// ─── Type augmentation ────────────────────────────────────────────────────────

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: { sub: string };
        user: { id: string };
    }
}

declare module 'fastify' {
    interface FastifyRequest {
        /**
         * Populated after `fastify.authenticate` runs.
         * Contains full role name + resolved permissions list.
         */
        userPermissions: UserPermissions;
    }
    interface FastifyInstance {
        /** Verify the JWT and populate request.userPermissions. */
        authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;

        /**
         * Factory that returns a preHandler verifying authentication AND a specific permission.
         *
         * Usage in route:
         *   preHandler: [fastify.requirePermission('create', 'products')]
         */
        requirePermission: (
            action: Action,
            resource: Resource,
        ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;

        /**
         * Convenience helper — same as requirePermission('manage', '*').
         * Only super_admin role passes by default.
         */
        superAdminOnly: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;

        /**
         * Convenience helper — allows super_admin and admin roles.
         */
        adminOnly: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const authRoutes: FastifyPluginAsync = async (fastify) => {
    console.log('Registering authRoutes, authenticate exists:', !!fastify.authenticate);
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    await fastify.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: env.JWT_EXPIRES_IN },
    });

    // ── authenticate ──────────────────────────────────────────────────────────
    fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
        try {
            const payload = await request.jwtVerify<{ sub: string }>();
            request.user = { id: payload.sub };
        } catch {
            throw new UnauthorizedError();
        }

        // Load full permissions from DB and attach to request
        const perms = await permissionService.getUserPermissions(request.user.id);
        if (!perms) throw new UnauthorizedError('Account not found or inactive');
        request.userPermissions = perms;
    });

    // ── requirePermission ─────────────────────────────────────────────────────
    fastify.decorate(
        'requirePermission',
        (action: Action, resource: Resource) =>
            async (request: FastifyRequest, reply: FastifyReply) => {
                await fastify.authenticate(request, reply);
                if (!permissionService.can(request.userPermissions, action, resource)) {
                    throw new ForbiddenError(
                        `You do not have permission to ${action} ${resource}`,
                    );
                }
            },
    );

    // ── superAdminOnly ────────────────────────────────────────────────────────
    fastify.decorate('superAdminOnly', async (request: FastifyRequest, reply: FastifyReply) => {
        await fastify.authenticate(request, reply);
        if (!permissionService.can(request.userPermissions, 'manage', '*')) {
            throw new ForbiddenError('Super admin access required');
        }
    });

    // ── adminOnly ─────────────────────────────────────────────────────────────
    fastify.decorate('adminOnly', async (request: FastifyRequest, reply: FastifyReply) => {
        await fastify.authenticate(request, reply);
        const role = request.userPermissions.roleName;
        const isAdmin = role === 'super_admin' || role === 'admin';
        if (!isAdmin && !permissionService.can(request.userPermissions, 'manage', '*')) {
            throw new ForbiddenError('Admin access required');
        }
    });
};

export default fp(authRoutes, { name: 'auth' });

import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { rbacService } from './service.js';
import {
    CreateRoleSchema,
    UpdateRoleSchema,
    CreatePermissionSchema,
    AssignPermissionsSchema,
} from './schema.js';
import { IdParamSchema } from '@/shared/types.js';

const rbacRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.register(
        async (instance) => {
            const app = instance.withTypeProvider<ZodTypeProvider>();
            app.addHook('onRequest', fastify.authenticate);
            app.addHook('onRequest', fastify.adminOnly);

            // ─── Roles ────────────────────────────────────────────────────────

            app.get('/roles', {
                schema: {
                    tags: ['Admin | RBAC'],
                    summary: 'List all roles',
                    description: 'Returns all roles with their assigned permissions.',
                },
                handler: async (_request, reply) => {
                    const roles = await rbacService.listRoles();
                    return reply.sendOk(roles);
                },
            });

            app.get('/roles/:id', {
                schema: {
                    tags: ['Admin | RBAC'],
                    summary: 'Get role by ID',
                    params: IdParamSchema,
                },
                handler: async (request, reply) => {
                    const role = await rbacService.getRoleById(request.params.id);
                    return reply.sendOk(role);
                },
            });

            app.post('/roles', {
                schema: {
                    tags: ['Admin | RBAC'],
                    summary: 'Create a new role',
                    body: CreateRoleSchema,
                },
                handler: async (request, reply) => {
                    const role = await rbacService.createRole(request.body);
                    return reply.sendCreated(role);
                },
            });

            app.put('/roles/:id', {
                schema: {
                    tags: ['Admin | RBAC'],
                    summary: 'Update a role',
                    params: IdParamSchema,
                    body: UpdateRoleSchema,
                },
                handler: async (request, reply) => {
                    const role = await rbacService.updateRole(request.params.id, request.body);
                    return reply.sendOk(role);
                },
            });

            app.delete('/roles/:id', {
                schema: {
                    tags: ['Admin | RBAC'],
                    summary: 'Delete a role',
                    description: 'Cannot delete protected roles (super_admin, admin, customer).',
                    params: IdParamSchema,
                },
                handler: async (request, reply) => {
                    await rbacService.deleteRole(request.params.id);
                    return reply.sendOk(null, 'Role deleted successfully');
                },
            });

            // ─── Permissions ──────────────────────────────────────────────────

            app.get('/permissions', {
                schema: {
                    tags: ['Admin | RBAC'],
                    summary: 'List all permissions',
                },
                handler: async (_request, reply) => {
                    const permissions = await rbacService.listPermissions();
                    return reply.sendOk(permissions);
                },
            });

            app.post('/permissions', {
                schema: {
                    tags: ['Admin | RBAC'],
                    summary: 'Create a new permission',
                    body: CreatePermissionSchema,
                },
                handler: async (request, reply) => {
                    const permission = await rbacService.createPermission(request.body);
                    return reply.sendCreated(permission);
                },
            });

            app.delete('/permissions/:id', {
                schema: {
                    tags: ['Admin | RBAC'],
                    summary: 'Delete a permission',
                    params: IdParamSchema,
                },
                handler: async (request, reply) => {
                    await rbacService.deletePermission(request.params.id);
                    return reply.sendOk(null, 'Permission deleted successfully');
                },
            });

            // ─── Role-Permission Assignment ───────────────────────────────────

            app.put('/roles/:id/permissions', {
                schema: {
                    tags: ['Admin | RBAC'],
                    summary: 'Assign permissions to a role',
                    description: 'Replaces all existing permissions for the role.',
                    params: IdParamSchema,
                    body: AssignPermissionsSchema,
                },
                handler: async (request, reply) => {
                    const role = await rbacService.assignPermissions(
                        request.params.id,
                        request.body.permissionIds,
                    );
                    return reply.sendOk(role);
                },
            });

            app.delete('/roles/:roleId/permissions/:permissionId', {
                schema: {
                    tags: ['Admin | RBAC'],
                    summary: 'Remove a permission from a role',
                    params: z.object({
                        roleId: IdParamSchema.shape.id,
                        permissionId: IdParamSchema.shape.id,
                    }),
                },
                handler: async (request, reply) => {
                    await rbacService.removePermission(
                        request.params.roleId,
                        request.params.permissionId,
                    );
                    return reply.sendOk(null, 'Permission removed from role');
                },
            });
        },
        { prefix: '/admin/rbac' },
    );
};

export default rbacRoutes;

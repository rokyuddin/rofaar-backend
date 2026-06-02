import { eq, and } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { roles, permissions, rolePermissions } from '@/db/schema/rbac.js';
import { NotFoundError, ConflictError } from '@/shared/errors.js';
import type { CreateRoleInput, UpdateRoleInput, CreatePermissionInput } from './schema.js';

export class RbacService {
    // ─── Roles ────────────────────────────────────────────────────────────────

    async listRoles() {
        return db.query.roles.findMany({
            with: {
                rolePermissions: {
                    with: {
                        permission: {
                            columns: { id: true, action: true, resource: true, description: true },
                        },
                    },
                },
            },
            orderBy: (r, { asc }) => [asc(r.name)],
        });
    }

    async getRoleById(id: string) {
        const role = await db.query.roles.findFirst({
            where: eq(roles.id, id),
            with: {
                rolePermissions: {
                    with: {
                        permission: {
                            columns: { id: true, action: true, resource: true, description: true },
                        },
                    },
                },
            },
        });

        if (!role) throw new NotFoundError('Role');
        return role;
    }

    async createRole(data: CreateRoleInput) {
        const existing = await db.query.roles.findFirst({
            where: eq(roles.name, data.name),
        });

        if (existing) throw new ConflictError('Role with this name already exists');

        const [role] = await db.insert(roles).values(data).returning();
        return role;
    }

    async updateRole(id: string, data: UpdateRoleInput) {
        if (data.name) {
            const existing = await db.query.roles.findFirst({
                where: and(eq(roles.name, data.name), eq(roles.id, id)),
            });

            if (!existing) {
                const duplicate = await db.query.roles.findFirst({
                    where: eq(roles.name, data.name),
                });
                if (duplicate) throw new ConflictError('Role with this name already exists');
            }
        }

        const [role] = await db
            .update(roles)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(roles.id, id))
            .returning();

        if (!role) throw new NotFoundError('Role');
        return role;
    }

    async deleteRole(id: string) {
        const role = await db.query.roles.findFirst({
            where: eq(roles.id, id),
            columns: { name: true },
        });

        if (!role) throw new NotFoundError('Role');

        const protectedRoles = ['super_admin', 'admin', 'customer'];
        if (protectedRoles.includes(role.name)) {
            throw new ConflictError(`Cannot delete protected role: ${role.name}`);
        }

        const [deleted] = await db.delete(roles).where(eq(roles.id, id)).returning();
        return deleted;
    }

    // ─── Permissions ──────────────────────────────────────────────────────────

    async listPermissions() {
        return db.query.permissions.findMany({
            orderBy: (p, { asc }) => [asc(p.resource), asc(p.action)],
        });
    }

    async createPermission(data: CreatePermissionInput) {
        const existing = await db.query.permissions.findFirst({
            where: and(
                eq(permissions.action, data.action),
                eq(permissions.resource, data.resource),
            ),
        });

        if (existing) throw new ConflictError('Permission with this action and resource already exists');

        const [permission] = await db.insert(permissions).values(data).returning();
        return permission;
    }

    async deletePermission(id: string) {
        const [deleted] = await db.delete(permissions).where(eq(permissions.id, id)).returning();
        if (!deleted) throw new NotFoundError('Permission');
        return deleted;
    }

    // ─── Role-Permission Assignment ───────────────────────────────────────────

    async assignPermissions(roleId: string, permissionIds: string[]) {
        const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
        if (!role) throw new NotFoundError('Role');

        await db.transaction(async (tx) => {
            // Remove existing permissions
            await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

            // Add new permissions
            if (permissionIds.length > 0) {
                await tx
                    .insert(rolePermissions)
                    .values(permissionIds.map((permissionId) => ({ roleId, permissionId })));
            }
        });

        return this.getRoleById(roleId);
    }

    async removePermission(roleId: string, permissionId: string) {
        const [deleted] = await db
            .delete(rolePermissions)
            .where(
                and(
                    eq(rolePermissions.roleId, roleId),
                    eq(rolePermissions.permissionId, permissionId),
                ),
            )
            .returning();

        if (!deleted) throw new NotFoundError('Permission assignment');
        return deleted;
    }
}

export const rbacService = new RbacService();

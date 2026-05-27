import { eq, and } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { roles, permissions, rolePermissions } from '@/db/schema/rbac.js';
import { users } from '@/db/schema/user.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';
export type Resource = string; // e.g. 'products', 'orders', 'users', '*'

export interface UserPermissions {
    id: string;
    name: string;
    email: string;
    roleId: string;
    roleName: string;
    permissions: Array<{ action: Action; resource: Resource }>;
}

// ─── Permission Service ───────────────────────────────────────────────────────

export class PermissionService {
    /**
     * Load a user with their full role + permissions from DB.
     * Called once on each authenticated request (results should be cached in-process if needed).
     */
    async getUserPermissions(userId: string): Promise<UserPermissions | null> {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true, name: true, email: true, roleId: true, isActive: true },
        });

        if (!user || !user.isActive) return null;

        const role = await db.query.roles.findFirst({
            where: eq(roles.id, user.roleId),
            columns: { id: true, name: true },
            with: {
                rolePermissions: {
                    with: {
                        permission: {
                            columns: { action: true, resource: true },
                        },
                    },
                },
            },
        });

        if (!role) return null;

        return {
            id: user.id,
            name: user.name ?? '',
            email: user.email ?? '',
            roleId: role.id,
            roleName: role.name,
            permissions: role.rolePermissions.map((rp) => ({
                action: rp.permission.action as Action,
                resource: rp.permission.resource,
            })),
        };
    }

    /**
     * Check whether a user has a given permission.
     * - `manage` action on any resource grants all actions on that resource.
     * - `manage` on `*` grants everything (super admin wildcard).
     */
    can(userPermissions: UserPermissions, action: Action, resource: Resource): boolean {
        return userPermissions.permissions.some((p) => {
            const actionMatch = p.action === action || p.action === 'manage';
            const resourceMatch = p.resource === resource || p.resource === '*';
            return actionMatch && resourceMatch;
        });
    }

    /**
     * Find a role by name.
     */
    async findRoleByName(name: string) {
        return db.query.roles.findFirst({ where: eq(roles.name, name) });
    }

    /**
     * Grant a permission to a role (idempotent).
     */
    async grantPermission(roleId: string, action: Action, resource: Resource) {
        // Find or create the permission
        let perm = await db.query.permissions.findFirst({
            where: and(eq(permissions.action, action), eq(permissions.resource, resource)),
        });
        if (!perm) {
            [perm] = await db
                .insert(permissions)
                .values({ action, resource })
                .returning();
        }

        // Grant it to the role (ignore conflict via unique index)
        await db
            .insert(rolePermissions)
            .values({ roleId, permissionId: perm!.id })
            .onConflictDoNothing();
    }
}

export const permissionService = new PermissionService();

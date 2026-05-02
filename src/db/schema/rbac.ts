import { pgTable, uuid, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Tables ──────────────────────────────────────────────────────────────────

/**
 * Roles table. Seeded with: super_admin, admin, operator, customer.
 * New roles can be added at runtime via the admin API without code changes.
 */
export const roles = pgTable('roles', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(), // e.g. super_admin | admin | operator | customer
    description: varchar('description', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Permissions table.
 * Each permission is an (action, resource) pair, e.g. (create, products).
 * Supported actions: create | read | update | delete | manage (wildcard for all).
 */
export const permissions = pgTable('permissions', {
    id: uuid('id').primaryKey().defaultRandom(),
    action: varchar('action', { length: 100 }).notNull(),   // create | read | update | delete | manage
    resource: varchar('resource', { length: 100 }).notNull(), // products | orders | users | * etc.
    description: varchar('description', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    actionResourceIdx: uniqueIndex('uq_action_resource').on(t.action, t.resource),
}));

/**
 * Join table linking roles to their allowed permissions.
 */
export const rolePermissions = pgTable('role_permissions', {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    rolePermissionIdx: uniqueIndex('uq_role_permission').on(t.roleId, t.permissionId),
}));

// ─── Relations ────────────────────────────────────────────────────────────────

export const rolesRelations = relations(roles, ({ many }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { users } = require('./user.js') as typeof import('./user.js');
    return {
        rolePermissions: many(rolePermissions),
        users: many(users),
    };
});

export const permissionsRelations = relations(permissions, ({ many }) => ({
    rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
    role: one(roles, {
        fields: [rolePermissions.roleId],
        references: [roles.id],
    }),
    permission: one(permissions, {
        fields: [rolePermissions.permissionId],
        references: [permissions.id],
    }),
}));

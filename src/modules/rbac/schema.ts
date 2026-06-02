import { z } from 'zod';

export const CreateRoleSchema = z.object({
    name: z
        .string()
        .min(1, { message: 'Role name is required' })
        .max(100, { message: 'Role name must be 100 characters or less' })
        .regex(/^[a-z_]+$/, { message: 'Role name must be lowercase with underscores only' }),
    description: z
        .string()
        .max(255, { message: 'Description must be 255 characters or less' })
        .optional(),
});

export const UpdateRoleSchema = z.object({
    name: z
        .string()
        .min(1, { message: 'Role name is required' })
        .max(100, { message: 'Role name must be 100 characters or less' })
        .regex(/^[a-z_]+$/, { message: 'Role name must be lowercase with underscores only' })
        .optional(),
    description: z
        .string()
        .max(255, { message: 'Description must be 255 characters or less' })
        .optional(),
});

export const CreatePermissionSchema = z.object({
    action: z
        .string()
        .min(1, { message: 'Action is required' })
        .max(100, { message: 'Action must be 100 characters or less' }),
    resource: z
        .string()
        .min(1, { message: 'Resource is required' })
        .max(100, { message: 'Resource must be 100 characters or less' }),
    description: z
        .string()
        .max(255, { message: 'Description must be 255 characters or less' })
        .optional(),
});

export const AssignPermissionsSchema = z.object({
    permissionIds: z
        .array(z.string().uuid({ message: 'Invalid permission ID' }))
        .min(1, { message: 'At least one permission ID is required' }),
});

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type CreatePermissionInput = z.infer<typeof CreatePermissionSchema>;
export type AssignPermissionsInput = z.infer<typeof AssignPermissionsSchema>;

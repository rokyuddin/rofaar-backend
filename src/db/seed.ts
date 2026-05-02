/**
 * Database Seed Script
 * -------------------
 * Seeds the default roles and permissions for the Rofaar e-commerce platform.
 *
 * Run with:
 *   npx tsx src/db/seed.ts
 */

import { db } from '@/config/db.js';
import { roles, permissions, rolePermissions } from '@/db/schema/rbac.js';
import { eq, and } from 'drizzle-orm';

// ─── Definitions ──────────────────────────────────────────────────────────────

const ROLES = [
    { name: 'super_admin', description: 'Full unrestricted access to everything' },
    { name: 'admin', description: 'Manage all catalog, orders, and users' },
    { name: 'operator', description: 'View and update orders; limited catalog access' },
    { name: 'customer', description: 'Standard user / buyer access' },
] as const;

type RoleName = (typeof ROLES)[number]['name'];

/** (action, resource) pairs per role */
const ROLE_PERMISSIONS: Record<RoleName, Array<[string, string]>> = {
    super_admin: [
        ['manage', '*'], // wildcard — grants everything
    ],
    admin: [
        // Products
        ['create', 'products'], ['read', 'products'], ['update', 'products'], ['delete', 'products'],
        // Categories
        ['create', 'categories'], ['read', 'categories'], ['update', 'categories'], ['delete', 'categories'],
        // Brands
        ['create', 'brands'], ['read', 'brands'], ['update', 'brands'], ['delete', 'brands'],
        // Banners
        ['create', 'banners'], ['read', 'banners'], ['update', 'banners'], ['delete', 'banners'],
        // Advertisements
        ['create', 'advertisements'], ['read', 'advertisements'], ['update', 'advertisements'], ['delete', 'advertisements'],
        // Orders
        ['read', 'orders'], ['update', 'orders'],
        // Coupons
        ['create', 'coupons'], ['read', 'coupons'], ['update', 'coupons'], ['delete', 'coupons'],
        // Reviews (moderation)
        ['read', 'reviews'], ['update', 'reviews'], ['delete', 'reviews'],
        // Users
        ['read', 'users'], ['update', 'users'],
        // Contact
        ['read', 'contacts'], ['update', 'contacts'],
    ],
    operator: [
        // Orders
        ['read', 'orders'], ['update', 'orders'],
        // Products (view only)
        ['read', 'products'],
        // Categories (view only)
        ['read', 'categories'],
        // Reviews (view only)
        ['read', 'reviews'],
    ],
    customer: [
        // Public read — kept for explicit record; actual public routes are unauthenticated
        ['read', 'products'],
        ['read', 'categories'],
        ['read', 'brands'],
        ['read', 'reviews'],
        // Own data
        ['manage', 'cart'],
        ['manage', 'wishlist'],
        ['manage', 'addresses'],
        ['create', 'orders'],
        ['read', 'orders'],
        ['create', 'reviews'],
        ['update', 'reviews'],
    ],
};

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
    console.log('🌱  Seeding roles and permissions…');

    // 1. Upsert roles
    const roleMap = new Map<RoleName, string>();
    for (const role of ROLES) {
        let existing = await db.query.roles.findFirst({ where: eq(roles.name, role.name) });
        if (!existing) {
            [existing] = await db.insert(roles).values(role).returning();
            console.log(`  ✅  Created role: ${role.name}`);
        } else {
            console.log(`  ⏭️   Role exists: ${role.name}`);
        }
        roleMap.set(role.name, existing!.id);
    }

    // 2. Upsert permissions and bind to roles
    for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS) as [RoleName, [string, string][]][]) {
        const roleId = roleMap.get(roleName)!;
        for (const [action, resource] of perms) {
            // Upsert permission
            let perm = await db.query.permissions.findFirst({
                where: and(eq(permissions.action, action), eq(permissions.resource, resource)),
            });
            if (!perm) {
                [perm] = await db.insert(permissions).values({ action, resource }).returning();
            }

            // Bind to role (idempotent)
            await db
                .insert(rolePermissions)
                .values({ roleId, permissionId: perm!.id })
                .onConflictDoNothing();
        }
        console.log(`  🔒  Permissions granted to "${roleName}"`);
    }

    console.log('\n✅  Seed complete!');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
});

import bcrypt from 'bcrypt';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { users } from '@/db/schema/user.js';
import { roles } from '@/db/schema/rbac.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '@/shared/errors.js';

export class AuthService {
    /** Register a new user as `customer` by default. */
    async register(data: { name: string; email: string; password: string }) {
        const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
        if (existing) throw new ConflictError('Email already in use');

        // Look up the default 'customer' role
        const customerRole = await db.query.roles.findFirst({
            where: eq(roles.name, 'customer'),
        });
        if (!customerRole) throw new NotFoundError('Default role not seeded');

        const passwordHash = await bcrypt.hash(data.password, 12);
        const [user] = await db
            .insert(users)
            .values({ name: data.name, email: data.email, passwordHash, roleId: customerRole.id })
            .returning();

        return { ...user!, role: customerRole.name };
    }


    /** Login and return the user record (role loaded separately for JWT). */
    async login(data: { email: string; password: string }) {
        const user = await db.query.users.findFirst({
            where: eq(users.email, data.email),
            with: { role: { columns: { name: true } } },
        });
        if (!user || !user.isActive) throw new UnauthorizedError('Invalid email or password');

        const valid = await bcrypt.compare(data.password, user.passwordHash);
        if (!valid) throw new UnauthorizedError('Invalid email or password');

        return { ...user, role: user.role.name };
    }


    /** Get the authenticated user's profile with role name. */
    async getMe(userId: string) {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true, name: true, email: true, roleId: true, isVerified: true, createdAt: true },
            with: {
                role: { columns: { name: true } },
            },
        });
        if (!user) throw new UnauthorizedError();
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role.name,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
        };
    }
}

export const customerAuthService = new CustomerAuthService();
export const operatorAuthService = new OperatorAuthService();
export const sharedAuthService = new SharedAuthService();

import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { users } from '@/db/schema/user.js';
import { ConflictError, UnauthorizedError } from '@/shared/errors.js';

export class AuthService {
    async register(data: { name: string; email: string; password: any }) {
        const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
        if (existing) throw new ConflictError('Email already in use');

        const passwordHash = await bcrypt.hash(data.password, 12);
        const [user] = await db.insert(users).values({
            name: data.name,
            email: data.email,
            passwordHash
        }).returning();

        return user!;
    }

    async login(data: { email: string; password: any }) {
        const user = await db.query.users.findFirst({ where: eq(users.email, data.email) });
        if (!user) throw new UnauthorizedError('Invalid email or password');

        const valid = await bcrypt.compare(data.password, user.passwordHash);
        if (!valid) throw new UnauthorizedError('Invalid email or password');

        return user;
    }

    async getMe(userId: string) {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true, name: true, email: true, role: true },
        });
        if (!user) throw new UnauthorizedError();
        return user;
    }
}

export const authService = new AuthService();

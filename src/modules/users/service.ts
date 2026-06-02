import { db } from '@/config/db.js';
import { users } from '@/db/schema/user.js';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@/shared/errors.js';
import type { AdminUpdateUserInput } from './schema.js';

export class UserService {
    async updateProfile(userId: string, data: { name?: string | undefined; email?: string | undefined; avatar?: string | undefined }) {
        const [user] = await db.update(users)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(users.id, userId))
            .returning();
        
        if (!user) throw new NotFoundError('User');
        return user;
    }

    async deleteAccount(userId: string) {
        const [user] = await db.delete(users).where(eq(users.id, userId)).returning();
        if (!user) throw new NotFoundError('User');
        return user;
    }

    async adminList() {
        return db.query.users.findMany({
            columns: {
                passwordHash: false,
                resetToken: false,
                resetTokenExpires: false,
            },
            with: {
                role: {
                    columns: {
                        name: true,
                    },
                },
            },
            orderBy: (u, { desc }) => [desc(u.createdAt)],
        });
    }

    async adminGetById(id: string) {
        const user = await db.query.users.findFirst({
            where: eq(users.id, id),
            columns: {
                passwordHash: false,
                resetToken: false,
                resetTokenExpires: false,
            },
            with: {
                role: {
                    columns: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!user) throw new NotFoundError('User');
        return user;
    }

    async adminUpdate(id: string, data: AdminUpdateUserInput) {
        const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };

        // Remove empty avatar string (treat as null)
        if (data.avatar === '') {
            updateData.avatar = null;
        }

        const [user] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning();

        if (!user) throw new NotFoundError('User');

        return this.adminGetById(id);
    }

    async adminDelete(id: string) {
        const [user] = await db.delete(users).where(eq(users.id, id)).returning();
        if (!user) throw new NotFoundError('User');
        return user;
    }
}

export const userService = new UserService();

import { db } from '@/config/db.js';
import { users } from '@/db/schema/user.js';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@/shared/errors.js';

export class UserService {
    async updateProfile(userId: string, data: { name?: string; email?: string; avatar?: string }) {
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
            orderBy: (u, { desc }) => [desc(u.createdAt)],
        });
    }
}

export const userService = new UserService();

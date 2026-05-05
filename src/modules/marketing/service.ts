import { db } from '@/config/db.js';
import { users } from '@/db/schema/user.js';
import { eq, sql } from 'drizzle-orm';

export class MarketingService {
    async grantLoyaltyPoints(userId: string, orderTotal: number, tx?: any) {
        const database = tx || db;
        const points = Math.floor(orderTotal / 100);
        if (points <= 0) return;

        await database.update(users)
            .set({ loyaltyPoints: sql`${users.loyaltyPoints} + ${points}` })
            .where(eq(users.id, userId));
    }

    async getLoyaltyStatus(userId: string) {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { loyaltyPoints: true },
        });
        return user;
    }
}

export const marketingService = new MarketingService();

import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { banners } from '@/db/schema/marketing.js';
import { NotFoundError } from '@/shared/errors.js';

export class BannerService {
    async list(onlyActive = true) {
        const conditions = [];
        if (onlyActive) conditions.push(eq(banners.isActive, true));

        return db.query.banners.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            orderBy: [asc(banners.sortOrder)],
        });
    }

    async create(data: any) {
        const [banner] = await db.insert(banners).values(data).returning();
        return banner!;
    }

    async update(id: string, data: any) {
        const [banner] = await db
            .update(banners)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(banners.id, id))
            .returning();
        
        if (!banner) throw new NotFoundError('Banner');
        return banner;
    }

    async delete(id: string) {
        const [banner] = await db.delete(banners).where(eq(banners.id, id)).returning();
        if (!banner) throw new NotFoundError('Banner');
        return banner;
    }
}

export const bannerService = new BannerService();

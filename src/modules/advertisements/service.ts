import { eq, and } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { advertisements } from '@/db/schema/marketing.js';
import { NotFoundError } from '@/shared/errors.js';

export class AdvertisementService {
    async list(filters: { position?: string | undefined; onlyActive?: boolean | undefined } = {}) {
        const { position, onlyActive = true } = filters;
        const conditions = [];
        if (onlyActive) conditions.push(eq(advertisements.isActive, true));
        if (position) conditions.push(eq(advertisements.position, position));

        return db.query.advertisements.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
        });
    }

    async create(data: any) {
        const [ad] = await db.insert(advertisements).values(data).returning();
        return ad!;
    }

    async update(id: string, data: any) {
        const [ad] = await db
            .update(advertisements)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(advertisements.id, id))
            .returning();
        
        if (!ad) throw new NotFoundError('Advertisement');
        return ad;
    }

    async delete(id: string) {
        const [ad] = await db.delete(advertisements).where(eq(advertisements.id, id)).returning();
        if (!ad) throw new NotFoundError('Advertisement');
        return ad;
    }
}

export const advertisementService = new AdvertisementService();

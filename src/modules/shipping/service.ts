import { db } from '@/config/db.js';
import { shippingZones, shippingMethods } from '@/db/schema/shipping.js';
import { eq, and } from 'drizzle-orm';
import { NotFoundError } from '@/shared/errors.js';

export class ShippingService {
    async createZone(data: { name: string; description?: string | undefined }) {
        const [zone] = await db.insert(shippingZones).values(data).returning();
        return zone;
    }

    async getZones() {
        return db.query.shippingZones.findMany({
            with: { methods: true },
        });
    }

    async createMethod(data: { zoneId: string; name: string; cost: number; estimatedDays?: string | undefined }) {
        const zone = await db.query.shippingZones.findFirst({
            where: eq(shippingZones.id, data.zoneId),
        });
        if (!zone) throw new NotFoundError('Shipping Zone');

        const [method] = await db.insert(shippingMethods).values({
            ...data,
            cost: data.cost.toString(),
        }).returning();
        return method;
    }

    async deleteMethod(id: string) {
        const [deleted] = await db.delete(shippingMethods).where(eq(shippingMethods.id, id)).returning();
        if (!deleted) throw new NotFoundError('Shipping Method');
        return deleted;
    }

    async updateZone(id: string, data: { name?: string | undefined; description?: string | undefined }) {
        const [zone] = await db.update(shippingZones).set(data).where(eq(shippingZones.id, id)).returning();
        if (!zone) throw new NotFoundError('Shipping Zone');
        return zone;
    }

    async deleteZone(id: string) {
        const [deleted] = await db.delete(shippingZones).where(eq(shippingZones.id, id)).returning();
        if (!deleted) throw new NotFoundError('Shipping Zone');
        return deleted;
    }

    async calculateShipping(zoneId: string, methodId: string) {
        const method = await db.query.shippingMethods.findFirst({
            where: and(
                eq(shippingMethods.id, methodId),
                eq(shippingMethods.zoneId, zoneId),
                eq(shippingMethods.isActive, true)
            ),
        });
        if (!method) throw new NotFoundError('Shipping Method in this Zone');
        return method;
    }

    async updateMethod(id: string, data: { name?: string | undefined; cost?: number | undefined; estimatedDays?: string | undefined; isActive?: boolean | undefined }) {
        const [method] = await db.update(shippingMethods).set({
            ...data,
            cost: data.cost !== undefined ? data.cost.toString() : undefined,
        }).where(eq(shippingMethods.id, id)).returning();
        if (!method) throw new NotFoundError('Shipping Method');
        return method;
    }
}

export const shippingService = new ShippingService();

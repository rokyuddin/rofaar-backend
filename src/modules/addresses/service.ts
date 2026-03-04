import { eq, and } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { addresses } from '@/db/schema/address.js';
import { NotFoundError } from '@/shared/errors.js';
import type { CreateAddressBody, UpdateAddressBody, DeleteAddressBody } from './schema.js';

export class AddressService {
    async list(userId: string) {
        return db.query.addresses.findMany({
            where: eq(addresses.userId, userId),
            orderBy: (addresses, { desc }) => [desc(addresses.isDefault), desc(addresses.createdAt)],
        });
    }

    async create(userId: string, data: CreateAddressBody) {
        if (data.isDefault) {
            await this.clearDefaults(userId);
        }

        const [address] = await db
            .insert(addresses)
            .values({
                userId,
                label: data.label,
                recipientName: data.name,
                phone: data.phone,
                altPhone: data.altPhone,
                address: data.address,
                city: data.city,
                area: data.area,
                zone: data.zone,
                isDefault: data.isDefault,
            })
            .returning();

        return address!;
    }

    async update(userId: string, data: UpdateAddressBody) {
        if (data.isDefault) {
            await this.clearDefaults(userId);
        }

        const [address] = await db
            .update(addresses)
            .set({
                label: data.label,
                recipientName: data.name,
                phone: data.phone,
                altPhone: data.altPhone,
                address: data.address,
                city: data.city,
                area: data.area,
                zone: data.zone,
                isDefault: data.isDefault,
                updatedAt: new Date(),
            })
            .where(and(eq(addresses.id, data.id), eq(addresses.userId, userId)))
            .returning();

        if (!address) throw new NotFoundError('Address');
        return address;
    }

    async delete(userId: string, id: string) {
        const [address] = await db
            .delete(addresses)
            .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
            .returning();

        if (!address) throw new NotFoundError('Address');
        return address;
    }

    private async clearDefaults(userId: string) {
        await db
            .update(addresses)
            .set({ isDefault: false })
            .where(eq(addresses.userId, userId));
    }
}

export const addressService = new AddressService();

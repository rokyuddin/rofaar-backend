import { eq, and } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { addresses } from '@/db/schema/address.js';
import { NotFoundError } from '@/shared/errors.js';

export class AddressService {
    async list(userId: string) {
        return db.query.addresses.findMany({
            where: eq(addresses.userId, userId),
            orderBy: (addresses, { desc }) => [desc(addresses.isDefault), desc(addresses.createdAt)],
        });
    }

    async create(userId: string, data: any) {
        return await db.transaction(async (tx) => {
            // If setting as default, unset other defaults
            if (data.isDefault) {
                await tx
                    .update(addresses)
                    .set({ isDefault: false })
                    .where(eq(addresses.userId, userId));
            }

            const [address] = await tx
                .insert(addresses)
                .values({ ...data, userId })
                .returning();
            
            return address!;
        });
    }

    async update(userId: string, id: string, data: any) {
        return await db.transaction(async (tx) => {
            if (data.isDefault) {
                await tx
                    .update(addresses)
                    .set({ isDefault: false })
                    .where(eq(addresses.userId, userId));
            }

            const [address] = await tx
                .update(addresses)
                .set({ ...data, updatedAt: new Date() })
                .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
                .returning();
            
            if (!address) throw new NotFoundError('Address');
            return address;
        });
    }

    async delete(userId: string, id: string) {
        const [address] = await db
            .delete(addresses)
            .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
            .returning();
        
        if (!address) throw new NotFoundError('Address');
        return address;
    }
}

export const addressService = new AddressService();

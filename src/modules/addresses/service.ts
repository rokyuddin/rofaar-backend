import { eq, and, count } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { addresses } from '@/db/schema/address.js';
import { NotFoundError } from '@/shared/errors.js';
import { CreateAddressSchema, UpdateAddressSchema } from './schema.js';
import { z } from 'zod';

type CreateAddressInput = z.infer<typeof CreateAddressSchema>;
type UpdateAddressInput = z.infer<typeof UpdateAddressSchema>;

export class AddressService {
    async list(userId: string) {
        return db.query.addresses.findMany({
            where: eq(addresses.userId, userId),
            orderBy: (addresses, { desc }) => [desc(addresses.isDefault), desc(addresses.createdAt)],
        });
    }

    async create(userId: string, data: CreateAddressInput) {
        return await db.transaction(async (tx) => {
            const [{ cnt }] = await tx
                .select({ cnt: count() })
                .from(addresses)
                .where(eq(addresses.userId, userId));

            const isFirstAddress = cnt === 0;
            const isDefault = isFirstAddress ? true : data.isDefault;

            if (isDefault) {
                await tx
                    .update(addresses)
                    .set({ isDefault: false })
                    .where(eq(addresses.userId, userId));
            }

            const [address] = await tx
                .insert(addresses)
                .values({ ...data, isDefault, userId })
                .returning();
            
            return address!;
        });
    }

    async update(userId: string, id: string, data: UpdateAddressInput) {
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

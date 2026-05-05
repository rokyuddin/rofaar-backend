import { db } from '@/config/db.js';
import { combos, comboItems } from '@/db/schema/combo.js';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@/shared/errors.js';

export class ComboService {
    async create(data: { 
        name: string; 
        description?: string; 
        price: number; 
        items: { productId: string; quantity: number }[] 
    }) {
        return db.transaction(async (tx) => {
            const [combo] = await tx.insert(combos).values({
                name: data.name,
                description: data.description,
                price: data.price.toString(),
            }).returning();

            await tx.insert(comboItems).values(
                data.items.map(item => ({
                    comboId: combo!.id,
                    productId: item.productId,
                    quantity: item.quantity,
                }))
            );

            return combo;
        });
    }

    async list() {
        return db.query.combos.findMany({
            where: eq(combos.isActive, true),
            with: { items: { with: { product: true } } },
        });
    }

    async delete(id: string) {
        const [deleted] = await db.delete(combos).where(eq(combos.id, id)).returning();
        if (!deleted) throw new NotFoundError('Combo');
        return deleted;
    }
}

export const comboService = new ComboService();

import { db } from '@/config/db.js';
import { inventoryLogs } from '@/db/schema/inventory.js';
import { products } from '@/db/schema/product.js';
import { eq, sql } from 'drizzle-orm';
import { NotFoundError } from '@/shared/errors.js';

export class InventoryService {
    async adjustStock(data: { 
        productId: string; 
        quantityChange: number; 
        type: 'stock_increase' | 'stock_decrease' | 'manual_adjustment' | 'order_deduction' | 'return_restock';
        note?: string;
        performedBy?: string;
    }, tx?: any) {
        const database = tx || db;

        const product = await database.query.products.findFirst({
            where: eq(products.id, data.productId),
        });

        if (!product) throw new NotFoundError('Product');

        const newStock = product.stock + data.quantityChange;

        await database.update(products)
            .set({ stock: newStock, updatedAt: new Date() })
            .where(eq(products.id, data.productId));

        const [log] = await database.insert(inventoryLogs).values({
            productId: data.productId,
            type: data.type,
            quantityChange: data.quantityChange,
            stockAfter: newStock,
            note: data.note,
            performedBy: data.performedBy,
        }).returning();

        return log;
    }

    async getLogs(productId?: string) {
        return db.query.inventoryLogs.findMany({
            where: productId ? eq(inventoryLogs.productId, productId) : undefined,
            orderBy: (l, { desc }) => [desc(l.createdAt)],
            with: { product: { columns: { name: true } } },
        });
    }

    async getLowStockProducts() {
        return db.query.products.findMany({
            where: sql`${products.stock} <= ${products.lowStockThreshold}`,
            with: { category: true, brand: true },
        });
    }
}

export const inventoryService = new InventoryService();

import { db } from '@/config/db.js';
import { users } from '@/db/schema/user.js';
import { orders } from '@/db/schema/order.js';
import { products } from '@/db/schema/product.js';
import { count, sum } from 'drizzle-orm';

export class AdminService {
    async getStats() {
        const [userCount] = await db.select({ value: count() }).from(users);
        const [orderCount] = await db.select({ value: count() }).from(orders);
        const [productCount] = await db.select({ value: count() }).from(products);
        const [revenue] = await db.select({ value: sum(orders.total) }).from(orders);

        return {
            totalUsers: Number(userCount?.value ?? 0),
            totalOrders: Number(orderCount?.value ?? 0),
            totalProducts: Number(productCount?.value ?? 0),
            totalRevenue: Number(revenue?.value ?? 0).toFixed(2),
        };
    }

    async getRecentOrders() {
        return db.query.orders.findMany({
            limit: 10,
            orderBy: (o, { desc }) => [desc(o.createdAt)],
            with: { user: { columns: { name: true } } },
        });
    }
}

export const adminService = new AdminService();

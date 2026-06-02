import { db } from '@/config/db.js';
import { users } from '@/db/schema/user.js';
import { orders, orderItems } from '@/db/schema/order.js';
import { products } from '@/db/schema/product.js';
import { count, sum, sql, desc, eq, gte, lte, and } from 'drizzle-orm';
import type { GetSalesChartInput, GetTopSellingInput } from './schema.js';

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

    async getSalesChartData(params: GetSalesChartInput) {
        const { period, startDate, endDate } = params;

        let dateTruncFormat = 'day';
        if (period === 'weekly') dateTruncFormat = 'week';
        if (period === 'monthly') dateTruncFormat = 'month';

        const conditions = [];
        if (startDate) conditions.push(gte(orders.createdAt, new Date(startDate)));
        if (endDate) conditions.push(lte(orders.createdAt, new Date(endDate)));
        const queryConditions = conditions.length > 0 ? and(...conditions) : undefined;

        const whereClause = queryConditions ? sql`WHERE ${queryConditions}` : sql``;

        const raw = `
            SELECT date, SUM(revenue)::text AS revenue, SUM(orders)::int AS orders
            FROM (
                SELECT
                    to_char(date_trunc('${dateTruncFormat}', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
                    total AS revenue,
                    1 AS orders
                FROM orders
                ${queryConditions ? `WHERE ${this.buildWhere(params)}` : ''}
            ) AS bucketed
            GROUP BY date
            ORDER BY date ASC
        `;

        const results = await db.execute(sql.raw(raw));

        return (results as any[]).map((row: any) => ({
            date: row.date,
            revenue: Number(row.revenue ?? 0).toFixed(2),
            orders: Number(row.orders ?? 0),
        }));
    }

    private buildWhere(params: GetSalesChartInput): string {
        const parts: string[] = [];
        if (params.startDate) parts.push(`created_at >= '${params.startDate}'`);
        if (params.endDate) parts.push(`created_at <= '${params.endDate}'`);
        return parts.join(' AND ');
    }

    async getTopSellingProducts(params: GetTopSellingInput) {
        const results = await db
            .select({
                productId: products.id,
                name: products.name,
                slug: products.slug,
                totalQuantitySold: sum(orderItems.quantity),
                totalRevenue: sum(orderItems.totalPrice),
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(eq(orders.status, 'delivered')) // Only count completed sales
            .groupBy(products.id, products.name, products.slug)
            .orderBy(desc(sum(orderItems.quantity)))
            .limit(params.limit);

        return results.map(row => ({
            ...row,
            totalQuantitySold: Number(row.totalQuantitySold ?? 0),
            totalRevenue: Number(row.totalRevenue ?? 0).toFixed(2),
        }));
    }
}

export const adminService = new AdminService();

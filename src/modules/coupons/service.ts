import { eq, and, gte, sql } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { coupons } from '@/db/schema/coupon.js';
import { NotFoundError, BadRequestError } from '@/shared/errors.js';

export class CouponService {
    async list() {
        return db.query.coupons.findMany({
            orderBy: (coupons, { desc }) => [desc(coupons.createdAt)],
        });
    }

    async create(data: any) {
        const [coupon] = await db.insert(coupons).values(data).returning();
        return coupon!;
    }

    async update(id: string, data: any) {
        const [coupon] = await db
            .update(coupons)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(coupons.id, id))
            .returning();
        
        if (!coupon) throw new NotFoundError('Coupon');
        return coupon;
    }

    async delete(id: string) {
        const [coupon] = await db.delete(coupons).where(eq(coupons.id, id)).returning();
        if (!coupon) throw new NotFoundError('Coupon');
        return coupon;
    }

    async validate(code: string, orderAmount: number) {
        const coupon = await db.query.coupons.findFirst({
            where: and(
                eq(coupons.code, code),
                eq(coupons.isActive, true),
                sql`(${coupons.expiresAt} IS NULL OR ${coupons.expiresAt} > NOW())`
            ),
        });

        if (!coupon) throw new BadRequestError('Invalid or expired coupon');

        if (Number(coupon.minOrderAmount) > orderAmount) {
            throw new BadRequestError(`Minimum order amount for this coupon is ${coupon.minOrderAmount}`);
        }

        if (coupon.maxUsageCount !== null && coupon.usageCount >= coupon.maxUsageCount) {
            throw new BadRequestError('Coupon usage limit reached');
        }

        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (orderAmount * Number(coupon.discountValue)) / 100;
        } else {
            discount = Number(coupon.discountValue);
        }

        return {
            id: coupon.id,
            code: coupon.code,
            discount: Math.min(discount, orderAmount), // Discount cannot exceed order amount
        };
    }

    async incrementUsage(id: string) {
        await db
            .update(coupons)
            .set({ usageCount: sql`${coupons.usageCount} + 1` })
            .where(eq(coupons.id, id));
    }
}

export const couponService = new CouponService();

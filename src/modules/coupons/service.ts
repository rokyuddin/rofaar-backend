import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { coupons } from '@/db/schema/coupon.js';
import { NotFoundError, BadRequestError } from '@/shared/errors.js';
import type { CreateCouponBody, UpdateCouponBody } from './schema.js';

export class CouponService {
    async list() {
        return db.query.coupons.findMany({
            orderBy: [desc(coupons.createdAt)],
        });
    }

    async create(data: CreateCouponBody) {
        const [coupon] = await db
            .insert(coupons)
            .values({
                code: data.code,
                description: data.description,
                discountType: data.discountType,
                discountValue: data.discountValue.toString(),
                minOrderAmount: data.minOrderAmount.toString(),
                maxUsageCount: data.maxUsageCount,
                isActive: data.isActive,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            })
            .returning();

        return coupon!;
    }

    async update(id: string, data: UpdateCouponBody) {
        const [coupon] = await db
            .update(coupons)
            .set({
                code: data.code,
                description: data.description,
                discountType: data.discountType,
                discountValue: data.discountValue?.toString(),
                minOrderAmount: data.minOrderAmount?.toString(),
                maxUsageCount: data.maxUsageCount,
                isActive: data.isActive,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            })
            .where(eq(coupons.id, id))
            .returning();

        if (!coupon) throw new NotFoundError('Coupon');
        return coupon;
    }

    async delete(id: string) {
        const [coupon] = await db
            .delete(coupons)
            .where(eq(coupons.id, id))
            .returning();

        if (!coupon) throw new NotFoundError('Coupon');
        return coupon;
    }

    async validate(code: string, amount: number) {
        const coupon = await db.query.coupons.findFirst({
            where: and(eq(coupons.code, code), eq(coupons.isActive, true)),
        });

        if (!coupon) throw new BadRequestError('Invalid or inactive coupon');

        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
            throw new BadRequestError('Coupon has expired');
        }

        if (coupon.maxUsageCount && coupon.usageCount >= coupon.maxUsageCount) {
            throw new BadRequestError('Coupon usage limit reached');
        }

        if (coupon.minOrderAmount && amount < Number(coupon.minOrderAmount)) {
            throw new BadRequestError(`Minimum order amount for this coupon is ${coupon.minOrderAmount}`);
        }

        return coupon;
    }

    async incrementUsage(id: string) {
        await db
            .update(coupons)
            .set({ usageCount: sql`${coupons.usageCount} + 1` })
            .where(eq(coupons.id, id));
    }
}

export const couponService = new CouponService();

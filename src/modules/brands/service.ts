import { eq, ilike, and, count } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { brands } from '@/db/schema/brand.js';
import { NotFoundError } from '@/shared/errors.js';
import type { CreateBrand, UpdateBrand, BrandParams, AdminBrandParams } from './schema.js';

export class BrandService {
    async list(filters: BrandParams = { page: 1, limit: 10 }) {
        const { page, limit, search } = filters;
        const offset = (page - 1) * limit;

        const conditions = [eq(brands.isActive, true)];
        if (search) conditions.push(ilike(brands.name, `%${search}%`));

        const [rows, totalResult] = await Promise.all([
            db.query.brands.findMany({
                where: and(...conditions),
                limit,
                offset,
                orderBy: (brands, { asc }) => [asc(brands.name)],
            }),
            db.select({ value: count() }).from(brands).where(and(...conditions)),
        ]);

        return {
            rows,
            total: Number(totalResult[0]?.value ?? 0),
        };
    }

    async adminList(filters: AdminBrandParams) {
        const { page, limit, search, isActive } = filters;
        const offset = (page - 1) * limit;

        const conditions = [];
        if (isActive !== undefined) conditions.push(eq(brands.isActive, isActive));
        if (search) conditions.push(ilike(brands.name, `%${search}%`));

        const [rows, totalResult] = await Promise.all([
            db.query.brands.findMany({
                where: conditions.length > 0 ? and(...conditions) : undefined,
                limit,
                offset,
                orderBy: (brands, { asc }) => [asc(brands.name)],
            }),
            db.select({ value: count() }).from(brands).where(conditions.length > 0 ? and(...conditions) : undefined),
        ]);

        return {
            rows,
            total: Number(totalResult[0]?.value ?? 0),
        };
    }

    async getById(id: string) {
        const brand = await db.query.brands.findFirst({
            where: eq(brands.id, id),
        });
        if (!brand) throw new NotFoundError('Brand');
        return brand;
    }

    async getBySlug(slug: string) {
        const brand = await db.query.brands.findFirst({
            where: eq(brands.slug, slug),
        });
        if (!brand) throw new NotFoundError('Brand');
        return brand;
    }

    async create(data: CreateBrand) {
        const [brand] = await db.insert(brands).values(data).returning();
        return brand!;
    }

    async update(id: string, data: UpdateBrand) {

        const [brand] = await db
            .update(brands)
            .set(data)
            .where(eq(brands.id, id))
            .returning();
        
        if (!brand) throw new NotFoundError('Brand');
        return brand;
    }

    async delete(id: string) {
        const [brand] = await db.delete(brands).where(eq(brands.id, id)).returning();
        if (!brand) throw new NotFoundError('Brand');
        return brand;
    }
}

export const brandService = new BrandService();

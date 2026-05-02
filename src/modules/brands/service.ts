import { eq } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { brands } from '@/db/schema/brand.js';
import { NotFoundError } from '@/shared/errors.js';

export class BrandService {
    async list() {
        return db.query.brands.findMany({
            orderBy: (brands, { asc }) => [asc(brands.name)],
        });
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

    async create(data: { name: string; slug: string; description?: string; logoUrl?: string }) {
        const [brand] = await db.insert(brands).values(data).returning();
        return brand!;
    }

    async update(id: string, data: { name?: string | undefined; slug?: string | undefined; description?: string | undefined; logoUrl?: string | undefined }) {

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

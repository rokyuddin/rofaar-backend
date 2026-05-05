import { eq } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { categories } from '@/db/schema/category.js';
import { NotFoundError } from '@/shared/errors.js';
import type { CreateCategory, UpdateCategory } from './schema.js';

export class CategoryService {
    async list() {
        return db.query.categories.findMany({
            orderBy: (categories, { asc }) => [asc(categories.name)],
        });
    }

    async getById(id: string) {
        const category = await db.query.categories.findFirst({
            where: eq(categories.id, id),
        });
        if (!category) throw new NotFoundError('Category');
        return category;
    }

    async getBySlug(slug: string) {
        const category = await db.query.categories.findFirst({
            where: eq(categories.slug, slug),
        });
        if (!category) throw new NotFoundError('Category');
        return category;
    }

    async create(data: CreateCategory) {
        const [category] = await db.insert(categories).values(data).returning();
        return category!;
    }

    async update(id: string, data: UpdateCategory) {

        const [category] = await db
            .update(categories)
            .set(data)
            .where(eq(categories.id, id))
            .returning();
        
        if (!category) throw new NotFoundError('Category');
        return category;
    }

    async delete(id: string) {
        const [category] = await db.delete(categories).where(eq(categories.id, id)).returning();
        if (!category) throw new NotFoundError('Category');
        return category;
    }
}

export const categoryService = new CategoryService();

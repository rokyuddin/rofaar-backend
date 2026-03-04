import { eq } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { categories } from '@/db/schema/category.js';
import { tags } from '@/db/schema/tag.js';
import { slugify } from '@/shared/utils.js';
import type {
    CreateCategoryBody,
    UpdateCategoryBody,
    DeleteCategoryBody,
    CreateTagBody,
    UpdateTagBody,
    DeleteTagBody,
} from './schema.js';

export class CatalogService {
    // ─── Categories ──────────────────────────────────────────────────────────

    async createCategory(data: CreateCategoryBody) {
        const slug = data.slug || slugify(data.name);
        const [result] = await db.insert(categories).values({ ...data, slug }).returning();
        return result;
    }

    async updateCategory(data: UpdateCategoryBody) {
        const { id, ...updateData } = data;
        let finalUpdateData: any = { ...updateData };
        if (updateData.name && !updateData.slug) {
            finalUpdateData.slug = slugify(updateData.name);
        }
        const [result] = await db.update(categories).set(finalUpdateData).where(eq(categories.id, id)).returning();
        return result;
    }

    async deleteCategory(data: DeleteCategoryBody) {
        const [result] = await db.delete(categories).where(eq(categories.id, data.id)).returning();
        return result;
    }

    async listCategories() {
        return db.query.categories.findMany();
    }

    async getCategoryBySlug(slug: string) {
        return db.query.categories.findFirst({
            where: eq(categories.slug, slug),
        });
    }

    // ─── Tags ────────────────────────────────────────────────────────────────

    async createTag(data: CreateTagBody) {
        const slug = data.slug || slugify(data.name);
        const [result] = await db.insert(tags).values({ ...data, slug }).returning();
        return result;
    }

    async updateTag(data: UpdateTagBody) {
        const { id, ...updateData } = data;
        let finalUpdateData: any = { ...updateData };
        if (updateData.name && !updateData.slug) {
            finalUpdateData.slug = slugify(updateData.name);
        }
        const [result] = await db.update(tags).set(finalUpdateData).where(eq(tags.id, id)).returning();
        return result;
    }

    async deleteTag(data: DeleteTagBody) {
        const [result] = await db.delete(tags).where(eq(tags.id, data.id)).returning();
        return result;
    }

    async listTags() {
        return db.query.tags.findMany();
    }

    async getTagBySlug(slug: string) {
        return db.query.tags.findFirst({
            where: eq(tags.slug, slug),
        });
    }
}

export const catalogService = new CatalogService();

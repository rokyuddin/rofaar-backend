import { eq, ilike, and, count } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { categories } from '@/db/schema/category.js';
import { NotFoundError } from '@/shared/errors.js';
import { uploadService } from "@/shared/services/upload.js";
import type { CreateCategory, UpdateCategory, CategoryParams, AdminCategoryParams, FileUpload } from './schema.js';

export class CategoryService {
    async list(filters: CategoryParams = { page: 1, limit: 10 }) {
        const { page, limit, search } = filters;
        const offset = (page - 1) * limit;

        const conditions = [eq(categories.isActive, true)];
        if (search) conditions.push(ilike(categories.name, `%${search}%`));

        const [rows, totalResult] = await Promise.all([
            db.query.categories.findMany({
                where: and(...conditions),
                limit,
                offset,
                orderBy: (categories, { asc }) => [asc(categories.name)],
            }),
            db.select({ value: count() }).from(categories).where(and(...conditions)),
        ]);

        return {
            rows,
            total: Number(totalResult[0]?.value ?? 0),
        };
    }

    async adminList(filters: AdminCategoryParams) {
        const { page, limit, search, isActive } = filters;
        const offset = (page - 1) * limit;

        const conditions = [];
        if (isActive !== undefined) conditions.push(eq(categories.isActive, isActive));
        if (search) conditions.push(ilike(categories.name, `%${search}%`));

        const [rows, totalResult] = await Promise.all([
            db.query.categories.findMany({
                where: conditions.length > 0 ? and(...conditions) : undefined,
                limit,
                offset,
                orderBy: (categories, { asc }) => [asc(categories.name)],
            }),
            db.select({ value: count() }).from(categories).where(conditions.length > 0 ? and(...conditions) : undefined),
        ]);

        return {
            rows,
            total: Number(totalResult[0]?.value ?? 0),
        };
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

    async create(data: CreateCategory & { imageFile?: FileUpload }) {
        const { imageFile, ...categoryData } = data;
        let imageUrl = categoryData.imageUrl;

        try {
            if (imageFile) {
                imageUrl = await uploadService.uploadFile(
                    `categories/${imageFile.filename}`,
                    imageFile.mimetype,
                    imageFile.data
                );
            }

            const [category] = await db.insert(categories).values({
                ...categoryData,
                imageUrl,
            }).returning();
            return category!;
        } catch (error) {
            if (imageUrl && imageFile) {
                const key = imageUrl.split('/').pop();
                if (key) await uploadService.deleteFile(`categories/${key}`).catch(console.error);
            }
            throw error;
        }
    }

    async update(id: string, data: UpdateCategory & { imageFile?: FileUpload }) {
        const { imageFile, ...categoryData } = data;
        let imageUrl = categoryData.imageUrl;

        try {
            if (imageFile) {
                imageUrl = await uploadService.uploadFile(
                    `categories/${imageFile.filename}`,
                    imageFile.mimetype,
                    imageFile.data
                );
            }

            const [category] = await db
                .update(categories)
                .set({
                    ...categoryData,
                    imageUrl,
                })
                .where(eq(categories.id, id))
                .returning();
            
            if (!category) throw new NotFoundError('Category');
            return category;
        } catch (error) {
            if (imageUrl && imageFile) {
                const key = imageUrl.split('/').pop();
                if (key) await uploadService.deleteFile(`categories/${key}`).catch(console.error);
            }
            throw error;
        }
    }

    async delete(id: string) {
        const [category] = await db.delete(categories).where(eq(categories.id, id)).returning();
        if (!category) throw new NotFoundError('Category');
        return category;
    }
}

export const categoryService = new CategoryService();

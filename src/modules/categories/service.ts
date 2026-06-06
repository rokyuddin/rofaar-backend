import { eq, ilike, and, count, isNull } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { categories } from '@/db/schema/category.js';
import { NotFoundError, BadRequestError } from '@/shared/errors.js';
import { uploadService } from "@/shared/services/upload.js";
import type { CreateCategory, UpdateCategory, CategoryParams, AdminCategoryParams, FileUpload } from './schema.js';

export class CategoryService {
    /**
     * Build the denormalized `path` for a category by walking up its parent
     * chain. Path is stored as "Slug/SubSlug/SubSubSlug" — easy to filter
     * with `WHERE path LIKE 'Slug/SubSlug/%'`.
     */
    private async buildPath(parentId: string | null | undefined, selfSlug: string): Promise<string> {
        if (!parentId) return selfSlug;
        const parents: string[] = [];
        let current: string | null = parentId;
        // Bound the walk to avoid infinite loops in case of corrupted data
        for (let i = 0; i < 32; i++) {
            if (!current) break;
            const row: { slug: string; parentId: string | null } | undefined = await db.query.categories.findFirst({
                where: eq(categories.id, current),
                columns: { slug: true, parentId: true },
            });
            if (!row) break;
            parents.unshift(row.slug);
            current = row.parentId;
        }
        parents.push(selfSlug);
        return parents.join('/');
    }

    /**
     * Recompute and update the `path` of a category and all its descendants
     * after a parent rename or move. Called from `update()` when slug or
     * parentId changes.
     */
    private async rebaseSubtree(rootId: string, newRootSlug: string, parentPath: string) {
        const newPath = parentPath ? `${parentPath}/${newRootSlug}` : newRootSlug;
        await db.update(categories)
            .set({ path: newPath })
            .where(eq(categories.id, rootId));
        const children = await db.query.categories.findMany({
            where: eq(categories.parentId, rootId),
            columns: { id: true, slug: true },
        });
        for (const child of children) {
            await this.rebaseSubtree(child.id, child.slug, newPath);
        }
    }

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
        const { page, limit, search, isActive, parentId } = filters;
        const offset = (page - 1) * limit;

        const conditions = [];
        if (isActive !== undefined) conditions.push(eq(categories.isActive, isActive));
        if (search) conditions.push(ilike(categories.name, `%${search}%`));
        if (parentId !== undefined) {
            if (parentId === null) conditions.push(isNull(categories.parentId));
            else conditions.push(eq(categories.parentId, parentId));
        }

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
            with: { parent: { columns: { id: true, name: true, slug: true, path: true } } },
        });
        if (!category) throw new NotFoundError('Category');
        return category;
    }

    async getBySlug(slug: string) {
        const category = await db.query.categories.findFirst({
            where: eq(categories.slug, slug),
            with: { parent: { columns: { id: true, name: true, slug: true, path: true } } },
        });
        if (!category) throw new NotFoundError('Category');
        return category;
    }

    async create(data: CreateCategory & { imageFile?: FileUpload }) {
        const { imageFile, ...categoryData } = data;
        let imageUrl = categoryData.imageUrl;

        // If parentId is set, validate it exists
        if (categoryData.parentId) {
            const parent = await db.query.categories.findFirst({
                where: eq(categories.id, categoryData.parentId),
                columns: { id: true },
            });
            if (!parent) throw new BadRequestError(`Parent category ${categoryData.parentId} not found`);
        }

        const path = await this.buildPath(categoryData.parentId, categoryData.slug);

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
                path,
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
        const existing = await this.getById(id);

        const { imageFile, ...categoryData } = data;
        let imageUrl = categoryData.imageUrl;

        if (categoryData.parentId !== undefined && categoryData.parentId === id) {
            throw new BadRequestError('A category cannot be its own parent');
        }
        if (categoryData.parentId) {
            const parent = await db.query.categories.findFirst({
                where: eq(categories.id, categoryData.parentId),
                columns: { id: true },
            });
            if (!parent) throw new BadRequestError(`Parent category ${categoryData.parentId} not found`);
        }

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

            // If slug or parentId changed, rebase the path for this category
            // and all descendants so the denormalized path stays consistent.
            const slugChanged = categoryData.slug !== undefined && categoryData.slug !== existing.slug;
            const parentChanged = categoryData.parentId !== undefined && categoryData.parentId !== existing.parentId;
            if (slugChanged || parentChanged) {
                const newParentPath = category.parentId
                    ? (await db.query.categories.findFirst({
                          where: eq(categories.id, category.parentId),
                          columns: { path: true },
                      }))?.path ?? null
                    : null;
                await this.rebaseSubtree(category.id, category.slug, newParentPath ?? '');
            }

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

import { db } from '@/config/db.js';
import { categories } from '@/db/schema/category.js';
import { tags } from '@/db/schema/tag.js';

export class CatalogService {
    async listCategories() {
        return db.query.categories.findMany();
    }

    async listTags() {
        return db.query.tags.findMany();
    }
}

export const catalogService = new CatalogService();

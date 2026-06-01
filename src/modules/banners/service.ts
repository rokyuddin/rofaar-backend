import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { banners } from '@/db/schema/marketing.js';
import { NotFoundError } from '@/shared/errors.js';
import { uploadService } from "@/shared/services/upload.js";
import type { CreateBanner, UpdateBanner, FileUpload } from './schema.js';

export class BannerService {
    async list(onlyActive = true) {
        const conditions = [];
        if (onlyActive) conditions.push(eq(banners.isActive, true));

        return db.query.banners.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            orderBy: [asc(banners.sortOrder)],
        });
    }

    async create(data: CreateBanner & { imageFile?: FileUpload }) {
        const { imageFile, ...bannerData } = data;
        let imageUrl = bannerData.imageUrl;

        try {
            if (imageFile) {
                imageUrl = await uploadService.uploadFile(
                    `banners/${imageFile.filename}`,
                    imageFile.mimetype,
                    imageFile.data
                );
            }

            const [banner] = await db.insert(banners).values({
                ...bannerData,
                imageUrl,
            }).returning();
            return banner!;
        } catch (error) {
            if (imageUrl && imageFile) {
                const key = imageUrl.split('/').pop();
                if (key) await uploadService.deleteFile(`banners/${key}`).catch(console.error);
            }
            throw error;
        }
    }

    async update(id: string, data: UpdateBanner & { imageFile?: FileUpload }) {
        const { imageFile, ...bannerData } = data;
        let imageUrl = bannerData.imageUrl;

        try {
            if (imageFile) {
                imageUrl = await uploadService.uploadFile(
                    `banners/${imageFile.filename}`,
                    imageFile.mimetype,
                    imageFile.data
                );
            }

            const [banner] = await db
                .update(banners)
                .set({ 
                    ...bannerData, 
                    imageUrl,
                    updatedAt: new Date() 
                })
                .where(eq(banners.id, id))
                .returning();
            
            if (!banner) throw new NotFoundError('Banner');
            return banner;
        } catch (error) {
            if (imageUrl && imageFile) {
                const key = imageUrl.split('/').pop();
                if (key) await uploadService.deleteFile(`banners/${key}`).catch(console.error);
            }
            throw error;
        }
    }

    async delete(id: string) {
        const [banner] = await db.delete(banners).where(eq(banners.id, id)).returning();
        if (!banner) throw new NotFoundError('Banner');
        return banner;
    }
}

export const bannerService = new BannerService();

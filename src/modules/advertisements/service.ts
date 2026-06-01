import { eq, and } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { advertisements } from '@/db/schema/marketing.js';
import { NotFoundError } from '@/shared/errors.js';
import { uploadService } from "@/shared/services/upload.js";
import type { CreateAdvertisement, UpdateAdvertisement, FileUpload } from './schema.js';

export class AdvertisementService {
    async list(filters: { position?: string | undefined; onlyActive?: boolean | undefined } = {}) {
        const { position, onlyActive = true } = filters;
        const conditions = [];
        if (onlyActive) conditions.push(eq(advertisements.isActive, true));
        if (position) conditions.push(eq(advertisements.position, position));

        return db.query.advertisements.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
        });
    }

    async create(data: CreateAdvertisement & { imageFile?: FileUpload }) {
        const { imageFile, ...adData } = data;
        let imageUrl = adData.imageUrl;

        try {
            if (imageFile) {
                imageUrl = await uploadService.uploadFile(
                    `advertisements/${imageFile.filename}`,
                    imageFile.mimetype,
                    imageFile.data
                );
            }

            const [ad] = await db.insert(advertisements).values({
                ...adData,
                imageUrl,
            }).returning();
            return ad!;
        } catch (error) {
            if (imageUrl && imageFile) {
                const key = imageUrl.split('/').pop();
                if (key) await uploadService.deleteFile(`advertisements/${key}`).catch(console.error);
            }
            throw error;
        }
    }

    async update(id: string, data: UpdateAdvertisement & { imageFile?: FileUpload }) {
        const { imageFile, ...adData } = data;
        let imageUrl = adData.imageUrl;

        try {
            if (imageFile) {
                imageUrl = await uploadService.uploadFile(
                    `advertisements/${imageFile.filename}`,
                    imageFile.mimetype,
                    imageFile.data
                );
            }

            const [ad] = await db
                .update(advertisements)
                .set({ 
                    ...adData, 
                    imageUrl,
                    updatedAt: new Date() 
                })
                .where(eq(advertisements.id, id))
                .returning();
            
            if (!ad) throw new NotFoundError('Advertisement');
            return ad;
        } catch (error) {
            if (imageUrl && imageFile) {
                const key = imageUrl.split('/').pop();
                if (key) await uploadService.deleteFile(`advertisements/${key}`).catch(console.error);
            }
            throw error;
        }
    }

    async delete(id: string) {
        const [ad] = await db.delete(advertisements).where(eq(advertisements.id, id)).returning();
        if (!ad) throw new NotFoundError('Advertisement');
        return ad;
    }
}

export const advertisementService = new AdvertisementService();

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '@/config/env.js';

const r2Client = env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
    })
    : null;

export class UploadService {
    private getPublicUrl(key: string): string {
        return `${env.R2_PUBLIC_URL}/${key}`;
    }

    async uploadFile(filename: string, mimetype: string, data: Buffer): Promise<string> {
        if (!r2Client || !env.R2_BUCKET_NAME) {
            return 'https://example.com/mock-upload.jpg';
        }

        const key = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        await r2Client.send(
            new PutObjectCommand({
                Bucket: env.R2_BUCKET_NAME,
                Key: key,
                Body: data,
                ContentType: mimetype,
            })
        );

        return this.getPublicUrl(key);
    }

    async deleteFile(key: string): Promise<void> {
        if (!r2Client || !env.R2_BUCKET_NAME) {
            return;
        }

        await r2Client.send(
            new DeleteObjectCommand({
                Bucket: env.R2_BUCKET_NAME,
                Key: key,
            })
        );
    }

    isConfigured(): boolean {
        return !!(r2Client && env.R2_BUCKET_NAME && env.R2_PUBLIC_URL);
    }
}

export const uploadService = new UploadService();
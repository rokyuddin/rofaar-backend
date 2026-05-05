export class UploadService {
    async uploadFile(file: any): Promise<string> {
        // MOCK: Integration with AWS S3, Cloudinary, or local storage
        console.log('MOCK: Uploading file...');
        return 'https://example.com/mock-upload.jpg';
    }
}

export const uploadService = new UploadService();

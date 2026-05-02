import { eq, desc } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { contactSubmissions } from '@/db/schema/contact.js';
import { NotFoundError } from '@/shared/errors.js';

export class ContactService {
    async list() {
        return db.query.contactSubmissions.findMany({
            orderBy: [desc(contactSubmissions.createdAt)],
        });
    }

    async create(data: any) {
        const [submission] = await db.insert(contactSubmissions).values(data).returning();
        return submission!;
    }

    async updateStatus(id: string, status: 'pending' | 'read' | 'resolved') {
        const [submission] = await db
            .update(contactSubmissions)
            .set({ status })
            .where(eq(contactSubmissions.id, id))
            .returning();
        
        if (!submission) throw new NotFoundError('Contact submission');
        return submission;
    }

    async delete(id: string) {
        const [submission] = await db.delete(contactSubmissions).where(eq(contactSubmissions.id, id)).returning();
        if (!submission) throw new NotFoundError('Contact submission');
        return submission;
    }
}

export const contactService = new ContactService();

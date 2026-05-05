export class NotificationService {
    async sendSms(phone: string, message: string) {
        console.log(`MOCK SMS to ${phone}: ${message}`);
    }

    async sendEmail(email: string, subject: string, body: string) {
        console.log(`MOCK Email to ${email}: ${subject}`);
    }
}

export const notificationService = new NotificationService();

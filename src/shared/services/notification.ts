import { smsService } from './sms.js';

export class NotificationService {
    async sendSms(phone: string, message: string, senderId?: string, isSmartResend: boolean = false) {
        return smsService.sendSms(phone, message, senderId, isSmartResend);
    }

    async sendEmail(email: string, subject: string, body: string) {
        console.log(`MOCK Email to ${email}: ${subject}`);
    }

    async checkSmsBalance() {
        return smsService.getBalance();
    }
}

export const notificationService = new NotificationService();

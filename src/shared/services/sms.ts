import { env } from '@/config/env.js';
import fetch from 'node-fetch';

export interface SmsResponse {
    response_code: number;
    message: string;
    balance?: number;
    status?: string;
}

export class SmsService {
    private readonly apiUrl = 'https://api.smsgateway.com.bd/api';

    async sendSms(
        recipient: string,
        message: string,
        senderId?: string,
        isSmartResend: boolean = false
    ): Promise<SmsResponse> {
        const clientId = env.SMS_CLIENT_ID || 'client_01KTC';
        const apiKey = env.SMS_API_KEY || 'mY3sRbC5XTEuL1veXo0N';
        const configuredSenderId = senderId || env.SMS_SENDER_ID || '';
        if (!this.isConfigured()) {
            console.log(`MOCK SMS to ${recipient}: ${message}`);
            return {
                response_code: 200,
                message: 'SMS sent successfully (mock)',
            };
        }

        const endpoint = isSmartResend ? '/resend-message' : '/send-message';
        const payload: any = {
            client_id: clientId,
            key: apiKey,
            recipient,
            message,
        };

        if (configuredSenderId) {
            payload.sender_id = configuredSenderId;
        }

        try {
            const response = await fetch(`${this.apiUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as SmsResponse;
            return data;
        } catch (error) {
            console.error('SMS sending failed:', error);
            throw error;
        }
    }

    async getBalance(): Promise<SmsResponse> {
        if (!this.isConfigured()) {
            return {
                response_code: 200,
                message: 'Balance check (mock)',
                balance: 100.00,
                status: 'Active',
            };
        }

        const clientId = env.SMS_CLIENT_ID || 'client_01KTC';
        const payload = {
            client_id: clientId,
        };

        try {
            const response = await fetch(`${this.apiUrl}/get-balance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as SmsResponse;
            return data;
        } catch (error) {
            console.error('Balance check failed:', error);
            throw error;
        }
    }

    isConfigured(): boolean {
        return !!(env.SMS_CLIENT_ID && env.SMS_API_KEY);
    }
}

export const smsService = new SmsService();
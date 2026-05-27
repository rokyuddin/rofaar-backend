import { db } from '@/config/db.js';
import { logs } from '@/db/schema/log.js';

export const loggerService = {
    async log(level: 'info' | 'warn' | 'error', message: string, context?: any) {
        try {
            await db.insert(logs).values({
                level,
                message,
                context,
            });
        } catch (err) {
            console.error('Failed to save log to DB:', err);
        }
    },

    async info(message: string, context?: any) {
        return this.log('info', message, context);
    },

    async warn(message: string, context?: any) {
        return this.log('warn', message, context);
    },

    async error(message: string, context?: any) {
        return this.log('error', message, context);
    },
};

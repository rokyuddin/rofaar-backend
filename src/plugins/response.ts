import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import {
    sendOk,
    sendCreated,
    sendPaginated,
    type PaginationMeta,
    type SendOkOptions,
} from '@/shared/response.js';

declare module 'fastify' {
    interface FastifyReply {
        /** 200 — `{ success: true, data, message? }` */
        sendOk: <T>(data: T, messageOrOptions?: string | SendOkOptions) => FastifyReply;
        /** 201 — `{ success: true, data, message? }` */
        sendCreated: <T>(data: T, message?: string) => FastifyReply;
        /** 200 — `{ success: true, data: [], pagination }` */
        sendPaginated: <T>(data: T[], pagination: PaginationMeta, message?: string) => FastifyReply;
    }
}

const responsePlugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorateReply('sendOk', function (this: FastifyReply, data, messageOrOptions?) {
        return sendOk(this, data, messageOrOptions);
    });

    fastify.decorateReply('sendCreated', function (this: FastifyReply, data, message?) {
        return sendCreated(this, data, message);
    });

    fastify.decorateReply('sendPaginated', function (this: FastifyReply, data, pagination, message?) {
        return sendPaginated(this, data, pagination, message);
    });
};

export default fp(responsePlugin, { name: 'response' });

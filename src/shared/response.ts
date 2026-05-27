import type { FastifyReply } from 'fastify';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaginationMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
};

/** Standard success body: { success: true, message?, data } */
export type ApiSuccessResponse<T> = {
    success: true;
    message?: string;
    data: T;
};

/** Standard paginated body: { success: true, data, pagination } */
export type ApiPaginatedResponse<T> = {
    success: true;
    message?: string;
    data: T[];
    pagination: PaginationMeta & { totalPages: number };
};

/** Standard error body: { success: false, code, message, errors? } */
export type ApiErrorResponse = {
    success: false;
    code: string;
    message: string;
    errors?: Record<string, string[] | undefined>;
};

// ─── Body builders (use in handlers or error handler) ───────────────────────

export const success = <T>(data: T, message?: string): ApiSuccessResponse<T> => ({
    success: true,
    ...(message !== undefined && message !== '' ? { message } : {}),
    data,
});

export const paginated = <T>(
    data: T[],
    pagination: PaginationMeta,
    message?: string,
): ApiPaginatedResponse<T> => {
    const totalPages =
        pagination.totalPages ??
        (pagination.limit > 0 ? Math.ceil(pagination.total / pagination.limit) : 0);

    return {
        success: true,
        ...(message !== undefined && message !== '' ? { message } : {}),
        data,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages,
        },
    };
};

export const apiError = (
    code: string,
    message: string,
    errors?: Record<string, string[] | undefined>,
): ApiErrorResponse => ({
    success: false,
    code,
    message,
    ...(errors && Object.keys(errors).length > 0 ? { errors } : {}),
});

// ─── Reply send helpers (preferred in route handlers) ───────────────────────

export type SendOkOptions = {
    message?: string;
    statusCode?: number;
};

function resolveSendOkOptions(messageOrOptions?: string | SendOkOptions): SendOkOptions {
    if (typeof messageOrOptions === 'string') {
        return { message: messageOrOptions };
    }
    return messageOrOptions ?? {};
}

export function sendOk<T>(
    reply: FastifyReply,
    data: T,
    messageOrOptions?: string | SendOkOptions,
) {
    const options = resolveSendOkOptions(messageOrOptions);
    const statusCode = options.statusCode ?? 200;
    return reply.code(statusCode).send(success(data, options.message));
}

export function sendCreated<T>(reply: FastifyReply, data: T, message?: string) {
    return reply.code(201).send(success(data, message));
}

export function sendPaginated<T>(
    reply: FastifyReply,
    data: T[],
    pagination: PaginationMeta,
    message?: string,
) {
    return reply.code(200).send(paginated(data, pagination, message));
}

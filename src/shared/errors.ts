// ─── Custom error classes ────────────────────────────────────────────────────

export class AppError extends Error {
    constructor(
        public override message: string,
        public statusCode: number = 500,
        public code: string = 'INTERNAL_SERVER_ERROR',
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class UnauthorizedError extends AppError {
    constructor(msg = 'Unauthorized') {
        super(msg, 401, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends AppError {
    constructor(msg = 'Forbidden') {
        super(msg, 403, 'FORBIDDEN');
    }
}

export class ValidationError extends AppError {
    constructor(msg: string) {
        super(msg, 400, 'VALIDATION_ERROR');
    }
}

export class ConflictError extends AppError {
    constructor(msg: string) {
        super(msg, 409, 'CONFLICT');
    }
}

export class BadRequestError extends AppError {
    constructor(msg: string) {
        super(msg, 400, 'BAD_REQUEST');
    }
}

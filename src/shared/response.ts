// ─── Standard success response helpers ──────────────────────────────────────

export const success = <T>(data: T, message?: string) => ({
    success: true as const,
    ...(message && { message }),
    data,
});

export const paginated = <T>(
    data: T[],
    pagination: { page: number; limit: number; total: number },
) => ({
    success: true as const,
    data,
    pagination,
});

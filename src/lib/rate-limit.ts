const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
    }

    if (bucket.count >= limit) {
        return { allowed: false, retryAfterMs: bucket.resetAt - now };
    }

    bucket.count += 1;
    return { allowed: true };
}

export function rateLimitResponse(retryAfterMs: number) {
    return new Response(
        JSON.stringify({
            error: 'Too many requests. Please wait and try again.',
            retryAfterMs,
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
            },
        }
    );
}

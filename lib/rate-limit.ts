/**
 * Simple in-memory rate limiter for development
 * For production, consider using Redis-based rate limiting (e.g., @upstash/ratelimit)
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

/**
 * In-memory store for rate limit tracking
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
    /** Maximum number of requests allowed */
    max: number;
    /** Time window in milliseconds */
    windowMs: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
    /** Whether the request is allowed */
    allowed: boolean;
    /** Number of requests remaining in the current window */
    remaining: number;
    /** Timestamp when the rate limit resets */
    resetAt: number;
    /** Error message if rate limited */
    error?: string;
}

/**
 * Checks if a request is rate limited
 * 
 * @param key - Unique identifier for rate limiting (e.g., email, IP)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 * 
 * @example
 * ```typescript
 * const result = checkRateLimit('user@example.com', {
 *   max: 3,
 *   windowMs: 15 * 60 * 1000 // 15 minutes
 * });
 * 
 * if (!result.allowed) {
 *   return { error: result.error };
 * }
 * ```
 */
export function checkRateLimit(
    key: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    // If no entry or entry has expired, create a new one
    if (!entry || entry.resetAt <= now) {
        const resetAt = now + config.windowMs;
        rateLimitStore.set(key, {
            count: 1,
            resetAt,
        });

        return {
            allowed: true,
            remaining: config.max - 1,
            resetAt,
        };
    }

    // Check if rate limit exceeded
    if (entry.count >= config.max) {
        const waitTime = Math.ceil((entry.resetAt - now) / 1000 / 60); // minutes
        return {
            allowed: false,
            remaining: 0,
            resetAt: entry.resetAt,
            error: `Too many requests. Please try again in ${waitTime} minute${waitTime === 1 ? '' : 's'}.`,
        };
    }

    // Increment count
    entry.count += 1;
    rateLimitStore.set(key, entry);

    return {
        allowed: true,
        remaining: config.max - entry.count,
        resetAt: entry.resetAt,
    };
}

/**
 * Cleans up expired rate limit entries
 * Should be called periodically (e.g., via a cron job or interval)
 * 
 * @returns Number of entries cleaned up
 */
export function cleanupExpiredRateLimits(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt <= now) {
            rateLimitStore.delete(key);
            cleaned++;
        }
    }

    return cleaned;
}

/**
 * Resets rate limit for a specific key
 * Useful for testing or administrative purposes
 * 
 * @param key - Unique identifier to reset
 * @returns True if entry was found and reset
 */
export function resetRateLimit(key: string): boolean {
    return rateLimitStore.delete(key);
}

/**
 * Gets the current rate limit status for a key
 * 
 * @param key - Unique identifier to check
 * @param config - Rate limit configuration
 * @returns Current status without incrementing the counter
 */
export function getRateLimitStatus(
    key: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt <= now) {
        return {
            allowed: true,
            remaining: config.max,
            resetAt: now + config.windowMs,
        };
    }

    const remaining = Math.max(0, config.max - entry.count);
    const allowed = remaining > 0;

    return {
        allowed,
        remaining,
        resetAt: entry.resetAt,
        error: allowed ? undefined : 'Rate limit exceeded',
    };
}

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        cleanupExpiredRateLimits();
    }, 5 * 60 * 1000);
}

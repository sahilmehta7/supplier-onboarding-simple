/**
 * Retry utility with exponential backoff
 * Used for network requests that may fail temporarily
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   {
 *     maxAttempts: 3,
 *     initialDelay: 1000,
 *     isRetryable: isNetworkError
 *   }
 * );
 * ```
 */

export interface RetryOptions {
    /**
     * Maximum number of retry attempts
     * @default 3
     */
    maxAttempts?: number;

    /**
     * Initial delay in milliseconds before first retry
     * @default 1000
     */
    initialDelay?: number;

    /**
     * Maximum delay in milliseconds (caps exponential growth)
     * @default 10000
     */
    maxDelay?: number;

    /**
     * Multiplier for exponential backoff calculation
     * @default 2
     */
    backoffMultiplier?: number;

    /**
     * Optional function to determine if an error should trigger a retry
     * @param error - The error that occurred
     * @returns true if the error is retryable, false otherwise
     * @default () => true
     */
    isRetryable?: (error: unknown) => boolean;

    /**
     * Optional callback invoked before each retry attempt
     * @param attempt - The attempt number (1-indexed)
     * @param error - The error that triggered the retry
     */
    onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry">> = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    isRetryable: () => true,
};

/**
 * Executes a function with retry logic and exponential backoff
 * 
 * Automatically retries failed operations with increasing delays between attempts.
 * Useful for handling transient failures like network errors or temporary service outages.
 * 
 * @template T - The return type of the function being retried
 * @param fn - The async function to execute with retry logic
 * @param options - Configuration options for retry behavior
 * @returns Promise resolving to the function's result
 * @throws The last error if all retry attempts fail
 * 
 * @example
 * ```typescript
 * // Retry a fetch with network error detection
 * const data = await retryWithBackoff(
 *   async () => {
 *     const response = await fetch('/api/data');
 *     if (!response.ok) throw new Error('Request failed');
 *     return response.json();
 *   },
 *   {
 *     maxAttempts: 3,
 *     initialDelay: 1000,
 *     isRetryable: isNetworkError,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry attempt ${attempt}:`, error);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: unknown;
    let delay = opts.initialDelay;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if error is retryable
            if (!opts.isRetryable(error)) {
                throw error;
            }

            // Don't retry if this was the last attempt
            if (attempt >= opts.maxAttempts) {
                break;
            }

            // Call onRetry callback if provided
            options.onRetry?.(attempt, error);

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay));

            // Calculate next delay with exponential backoff
            delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
        }
    }

    throw lastError;
}

/**
 * Determines if an error is a network error that should be retried
 * 
 * Checks for common network-related error patterns including:
 * - TypeError with 'fetch' (fetch API failures)
 * - Errors containing 'network', 'timeout', 'connection'
 * - Node.js network error codes (ECONNREFUSED, ENOTFOUND)
 * 
 * @param error - The error to check
 * @returns true if the error is network-related, false otherwise
 * 
 * @example
 * ```typescript
 * try {
 *   await fetch('/api/data');
 * } catch (error) {
 *   if (isNetworkError(error)) {
 *     // Retry the request
 *   }
 * }
 * ```
 */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError && error.message.includes("fetch")) {
        return true;
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes("network") ||
            message.includes("timeout") ||
            message.includes("connection") ||
            message.includes("econnrefused") ||
            message.includes("enotfound")
        );
    }

    return false;
}

/**
 * Determines if an HTTP status code indicates a retryable error
 * 
 * Retryable status codes include:
 * - 408 Request Timeout
 * - 429 Too Many Requests
 * - 500 Internal Server Error
 * - 502 Bad Gateway
 * - 503 Service Unavailable
 * - 504 Gateway Timeout
 * 
 * @param status - HTTP status code to check
 * @returns true if the status code is retryable, false otherwise
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/data');
 * if (!response.ok && isRetryableStatus(response.status)) {
 *   // Retry the request
 * }
 * ```
 */
export function isRetryableStatus(status: number): boolean {
    // Retry on:
    // - 408 Request Timeout
    // - 429 Too Many Requests
    // - 500 Internal Server Error
    // - 502 Bad Gateway
    // - 503 Service Unavailable
    // - 504 Gateway Timeout
    return [408, 429, 500, 502, 503, 504].includes(status);
}

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.message.includes("Unauthorized")) {
          throw error;
        }
        if (error.message.includes("not found")) {
          throw error;
        }
        if (error.message.includes("OPTIMISTIC_LOCK_ERROR")) {
          throw error;
        }
      }

      // If this is the last attempt, throw
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * (attempt + 1))
      );

      if (onRetry) {
        onRetry(attempt + 1);
      }
    }
  }

  throw lastError!;
}


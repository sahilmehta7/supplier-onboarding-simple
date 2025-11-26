import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    retryWithBackoff,
    isNetworkError,
    isRetryableStatus,
} from "./retry";

describe("retryWithBackoff", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should succeed on first attempt", async () => {
        const mockFn = vi.fn().mockResolvedValue("success");

        const result = await retryWithBackoff(mockFn);

        expect(result).toBe("success");
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and eventually succeed", async () => {
        const mockFn = vi
            .fn()
            .mockRejectedValueOnce(new Error("Network error"))
            .mockRejectedValueOnce(new Error("Network error"))
            .mockResolvedValueOnce("success");

        const result = await retryWithBackoff(mockFn, {
            maxAttempts: 3,
            initialDelay: 10,
            isRetryable: isNetworkError,
        });

        expect(result).toBe("success");
        expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should throw after max attempts", async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error("Network error"));

        await expect(
            retryWithBackoff(mockFn, {
                maxAttempts: 3,
                initialDelay: 10,
                isRetryable: isNetworkError,
            })
        ).rejects.toThrow("Network error");

        expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should not retry non-retryable errors", async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error("Not retryable"));

        await expect(
            retryWithBackoff(mockFn, {
                maxAttempts: 3,
                initialDelay: 10,
                isRetryable: () => false,
            })
        ).rejects.toThrow("Not retryable");

        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should call onRetry callback", async () => {
        const mockFn = vi
            .fn()
            .mockRejectedValueOnce(new Error("Fail"))
            .mockResolvedValueOnce("success");

        const onRetry = vi.fn();

        await retryWithBackoff(mockFn, {
            maxAttempts: 2,
            initialDelay: 10,
            onRetry,
        });

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it("should use exponential backoff", async () => {
        const mockFn = vi
            .fn()
            .mockRejectedValueOnce(new Error("Fail 1"))
            .mockRejectedValueOnce(new Error("Fail 2"))
            .mockResolvedValueOnce("success");

        const startTime = Date.now();

        await retryWithBackoff(mockFn, {
            maxAttempts: 3,
            initialDelay: 100,
            backoffMultiplier: 2,
        });

        const duration = Date.now() - startTime;

        // Should wait at least 100ms + 200ms = 300ms
        expect(duration).toBeGreaterThanOrEqual(300);
    });
});

describe("isNetworkError", () => {
    it("should return true for TypeError with fetch", () => {
        const error = new TypeError("fetch failed");
        expect(isNetworkError(error)).toBe(true);
    });

    it("should return true for network-related errors", () => {
        expect(isNetworkError(new Error("network error"))).toBe(true);
        expect(isNetworkError(new Error("timeout occurred"))).toBe(true);
        expect(isNetworkError(new Error("connection refused"))).toBe(true);
        expect(isNetworkError(new Error("ECONNREFUSED"))).toBe(true);
        expect(isNetworkError(new Error("ENOTFOUND"))).toBe(true);
    });

    it("should return false for non-network errors", () => {
        expect(isNetworkError(new Error("Validation failed"))).toBe(false);
        expect(isNetworkError(new Error("User not found"))).toBe(false);
        expect(isNetworkError("string error")).toBe(false);
        expect(isNetworkError(null)).toBe(false);
    });
});

describe("isRetryableStatus", () => {
    it("should return true for retryable status codes", () => {
        expect(isRetryableStatus(408)).toBe(true); // Request Timeout
        expect(isRetryableStatus(429)).toBe(true); // Too Many Requests
        expect(isRetryableStatus(500)).toBe(true); // Internal Server Error
        expect(isRetryableStatus(502)).toBe(true); // Bad Gateway
        expect(isRetryableStatus(503)).toBe(true); // Service Unavailable
        expect(isRetryableStatus(504)).toBe(true); // Gateway Timeout
    });

    it("should return false for non-retryable status codes", () => {
        expect(isRetryableStatus(200)).toBe(false); // OK
        expect(isRetryableStatus(400)).toBe(false); // Bad Request
        expect(isRetryableStatus(401)).toBe(false); // Unauthorized
        expect(isRetryableStatus(403)).toBe(false); // Forbidden
        expect(isRetryableStatus(404)).toBe(false); // Not Found
    });
});

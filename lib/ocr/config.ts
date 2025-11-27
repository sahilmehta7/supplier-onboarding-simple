/**
 * OCR configuration and environment setup
 */

export const OCR_CONFIG = {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: (process.env.OPENAI_OCR_MODEL || "gpt-4o") as "gpt-4o" | "gpt-4o-mini",
    enabled: !!process.env.OPENAI_API_KEY,
} as const;

/**
 * Validates OCR configuration
 * @throws Error if configuration is invalid
 */
export function validateOCRConfig(): void {
    if (!OCR_CONFIG.enabled) {
        throw new Error(
            "OCR is not configured. Please set OPENAI_API_KEY environment variable."
        );
    }

    if (!["gpt-4o", "gpt-4o-mini"].includes(OCR_CONFIG.model)) {
        throw new Error(
            `Invalid OCR model: ${OCR_CONFIG.model}. Must be "gpt-4o" or "gpt-4o-mini".`
        );
    }
}

/**
 * Checks if OCR is available
 */
export function isOCRAvailable(): boolean {
    return OCR_CONFIG.enabled;
}

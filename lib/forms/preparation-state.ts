/**
 * Preparation state management
 * Tracks whether user has viewed the preparation page
 */

const PREP_VIEWED_KEY = "form_prep_viewed";

/**
 * Check if preparation page has been viewed for a specific form
 * Uses sessionStorage for temporary state
 */
export function hasPrepBeenViewed(formId: string): boolean {
    if (typeof window === "undefined") return false;

    try {
        const viewedForms = sessionStorage.getItem(PREP_VIEWED_KEY);
        if (!viewedForms) return false;

        const parsed = JSON.parse(viewedForms);
        return Array.isArray(parsed) && parsed.includes(formId);
    } catch {
        return false;
    }
}

/**
 * Mark preparation page as viewed for a specific form
 */
export function markPrepViewed(formId: string): void {
    if (typeof window === "undefined") return;

    try {
        const viewedForms = sessionStorage.getItem(PREP_VIEWED_KEY);
        let parsed: string[] = [];

        if (viewedForms) {
            parsed = JSON.parse(viewedForms);
            if (!Array.isArray(parsed)) {
                parsed = [];
            }
        }

        if (!parsed.includes(formId)) {
            parsed.push(formId);
            sessionStorage.setItem(PREP_VIEWED_KEY, JSON.stringify(parsed));
        }
    } catch (error) {
        console.error("Failed to mark prep as viewed:", error);
    }
}

/**
 * Clear preparation viewed state (useful for testing)
 */
export function clearPrepState(): void {
    if (typeof window === "undefined") return;

    try {
        sessionStorage.removeItem(PREP_VIEWED_KEY);
    } catch (error) {
        console.error("Failed to clear prep state:", error);
    }
}

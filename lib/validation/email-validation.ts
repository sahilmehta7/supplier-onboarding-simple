/**
 * Email validation utilities
 */

/**
 * Validates an email address format using RFC 5322 compliant regex
 * 
 * @param email - Email address to validate
 * @returns True if email format is valid
 * 
 * @example
 * ```typescript
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid-email') // false
 * ```
 */
export function isValidEmail(email: string): boolean {
    // RFC 5322 compliant email regex (simplified but comprehensive)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return false;
    }

    // Additional validation - check for valid characters
    const validEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    return validEmailRegex.test(email);
}

/**
 * Normalizes an email address (lowercase, trim whitespace)
 * 
 * @param email - Email address to normalize
 * @returns Normalized email address
 * 
 * @example
 * ```typescript
 * normalizeEmail('  User@Example.COM  ') // 'user@example.com'
 * ```
 */
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

/**
 * Validates and normalizes an email address
 * 
 * @param email - Email address to validate and normalize
 * @returns Normalized email address if valid, null otherwise
 * 
 * @example
 * ```typescript
 * validateAndNormalizeEmail('  User@Example.COM  ') // 'user@example.com'
 * validateAndNormalizeEmail('invalid') // null
 * ```
 */
export function validateAndNormalizeEmail(email: string): string | null {
    const normalized = normalizeEmail(email);
    return isValidEmail(normalized) ? normalized : null;
}

/**
 * Checks if an email is from a disposable email provider
 * Note: This is a basic check. For production, consider using a third-party service.
 * 
 * @param email - Email address to check
 * @returns True if the email appears to be from a disposable provider
 */
export function isDisposableEmail(email: string): boolean {
    const disposableDomains = [
        'tempmail.com',
        'throwaway.email',
        'guerrillamail.com',
        'mailinator.com',
        '10minutemail.com',
        'getnada.com',
        'temp-mail.org',
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    return disposableDomains.includes(domain);
}

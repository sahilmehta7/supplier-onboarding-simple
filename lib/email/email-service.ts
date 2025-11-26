import { Resend } from "resend";

/**
 * Email service configuration
 */
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
    if (!process.env.RESEND_API_KEY) {
        return null;
    }

    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }

    return resendClient;
}

const fromEmail = process.env.EMAIL_FROM || "noreply@localhost";

/**
 * Email sending options
 */
export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

/**
 * Result of sending an email
 */
export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Sends an email using Resend
 * 
 * @param options - Email options including recipient, subject, and content
 * @returns Result indicating success or failure
 * 
 * @example
 * ```typescript
 * const result = await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   html: '<p>Hello!</p>',
 *   text: 'Hello!'
 * });
 * ```
 */
export async function sendEmail(
    options: SendEmailOptions
): Promise<SendEmailResult> {
    try {
        // Validate email API key
        if (!process.env.RESEND_API_KEY) {
            console.error("RESEND_API_KEY is not configured");

            // In development, log the email instead of failing
            if (process.env.NODE_ENV === "development") {
                console.log("📧 [DEV MODE] Email would be sent:");
                console.log("  To:", options.to);
                console.log("  Subject:", options.subject);
                console.log("  HTML:", options.html);
                console.log("  Text:", options.text);

                return {
                    success: true,
                    messageId: `dev-${Date.now()}`,
                };
            }

            return {
                success: false,
                error: "Email service not configured",
            };
        }

        // Send email via Resend
        const resend = getResendClient();
        if (!resend) {
            return {
                success: false,
                error: "Email service not configured",
            };
        }

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });

        if (error) {
            console.error("Failed to send email:", error);
            return {
                success: false,
                error: error.message || "Failed to send email",
            };
        }

        return {
            success: true,
            messageId: data?.id,
        };
    } catch (error) {
        console.error("Email service error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Validates an email address format
 * 
 * @param email - Email address to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: string): boolean {
    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

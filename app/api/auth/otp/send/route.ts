import { NextRequest, NextResponse } from "next/server";
import { sendOTP } from "@/lib/auth/otp-service";
import { SendOTPSchema } from "@/lib/validation/otp-validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { ZodError } from "zod";

/**
 * POST /api/auth/otp/send
 * 
 * Sends an OTP to the specified email address
 * 
 * Request Body:
 * {
 *   "email": "user@example.com"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "OTP sent successfully",
 *   "expiresIn": 600
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();

        // Validate request
        const validatedData = SendOTPSchema.parse(body);
        const { email } = validatedData;

        // Check rate limit for this email
        const rateLimitResult = checkRateLimit(`otp-send:${email}`, {
            max: 3,
            windowMs: 15 * 60 * 1000, // 15 minutes
        });

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: rateLimitResult.error || "Too many requests",
                },
                { status: 429 }
            );
        }

        // Get client metadata for security tracking
        const metadata = {
            ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
            userAgent: request.headers.get("user-agent") || "unknown",
            timestamp: new Date().toISOString(),
        };

        // Send OTP
        const result = await sendOTP(email, metadata);

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error || "Failed to send OTP",
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "OTP sent successfully. Please check your email.",
                expiresIn: result.expiresIn,
            },
            { status: 200 }
        );
    } catch (error) {
        // Handle validation errors
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: error.issues[0]?.message || "Invalid request",
                    validationErrors: error.issues,
                },
                { status: 400 }
            );
        }

        // Handle JSON parse errors
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid JSON in request body",
                },
                { status: 400 }
            );
        }

        // Log unexpected errors with details
        console.error("Error in OTP send endpoint:");
        console.error("Error type:", error?.constructor?.name);
        console.error("Error message:", error instanceof Error ? error.message : String(error));
        console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

        return NextResponse.json(
            {
                success: false,
                error: "An unexpected error occurred. Please try again.",
                ...(process.env.NODE_ENV === "development" && {
                    debug: error instanceof Error ? error.message : String(error),
                }),
            },
            { status: 500 }
        );
    }
}

/**
 * Handle unsupported methods
 */
export async function GET() {
    return NextResponse.json(
        {
            success: false,
            error: "Method not allowed. Use POST to send OTP.",
        },
        { status: 405 }
    );
}

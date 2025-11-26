import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/auth/otp-service";
import { VerifyOTPSchema } from "@/lib/validation/otp-validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";

/**
 * POST /api/auth/otp/verify
 * 
 * Verifies an OTP and creates/updates user account
 * 
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "otp": "123456"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "OTP verified successfully",
 *   "user": {
 *     "id": "...",
 *     "email": "user@example.com"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();

        // Validate request
        const validatedData = VerifyOTPSchema.parse(body);
        const { email, otp } = validatedData;

        // Check rate limit for verification attempts
        const rateLimitResult = checkRateLimit(`otp-verify:${email}`, {
            max: 10,
            windowMs: 15 * 60 * 1000, // 15 minutes - more generous than send
        });

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: rateLimitResult.error || "Too many verification attempts",
                },
                { status: 429 }
            );
        }

        // Verify OTP
        const result = await verifyOTP(email, otp);

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error || "Invalid OTP",
                },
                { status: 400 }
            );
        }

        // OTP verified successfully - ensure user exists
        let user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                emailVerified: true,
            },
        });

        // If user doesn't exist, create them
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    emailVerified: new Date(), // Mark email as verified
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    emailVerified: true,
                },
            });
        } else if (!user.emailVerified) {
            // If user exists but email wasn't verified, update it
            user = await prisma.user.update({
                where: { email },
                data: {
                    emailVerified: new Date(),
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    emailVerified: true,
                },
            });
        }

        return NextResponse.json(
            {
                success: true,
                message: "Email verified successfully",
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    emailVerified: user.emailVerified,
                },
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

        // Log unexpected errors
        console.error("Error in OTP verify endpoint:", error);

        return NextResponse.json(
            {
                success: false,
                error: "An unexpected error occurred. Please try again.",
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
            error: "Method not allowed. Use POST to verify OTP.",
        },
        { status: 405 }
    );
}

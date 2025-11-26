import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/email-service";
import {
    generateOTPEmailHTML,
    generateOTPEmailText,
} from "@/lib/email/templates/otp-email";
import crypto from "crypto";
import { hash, compare } from "bcryptjs";
import { Prisma } from "@prisma/client";

/**
 * OTP configuration constants
 */
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || "6", 10);
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || "3", 10);

/**
 * Result of OTP operations
 */
export interface OTPResult {
    success: boolean;
    error?: string;
    expiresIn?: number; // seconds
}

/**
 * Generates a cryptographically secure random OTP
 * 
 * @param length - Length of the OTP (default: 6)
 * @returns Numeric OTP string
 */
export function generateOTP(length: number = OTP_LENGTH): string {
    const digits = "0123456789";
    let otp = "";

    // Use crypto.randomInt for cryptographically secure random numbers
    for (let i = 0; i < length; i++) {
        otp += digits[crypto.randomInt(0, digits.length)];
    }

    return otp;
}

/**
 * Sends an OTP to the specified email address
 * 
 * @param email - Email address to send OTP to
 * @param metadata - Optional metadata (IP, user agent, etc.)
 * @returns Result indicating success or failure
 */
export async function sendOTP(
    email: string,
    metadata?: Prisma.InputJsonValue
): Promise<OTPResult> {
    try {
        // Generate OTP
        const otp = generateOTP();

        // Hash the OTP before storing (security best practice)
        const hashedOTP = await hash(otp, 10);

        // Calculate expiry time
        const expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + OTP_EXPIRY_MINUTES);

        // Check for recent OTP requests (rate limiting at DB level)
        const recentTokens = await prisma.verificationToken.count({
            where: {
                identifier: email,
                // @ts-ignore - Prisma type update pending
                type: "otp",
                createdAt: {
                    gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
                },
            },
        });

        if (recentTokens >= 3) {
            return {
                success: false,
                error: "Too many OTP requests. Please try again later.",
            };
        }

        // Store the hashed OTP in database
        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token: hashedOTP,
                expires: expiryDate,
                // @ts-ignore - Prisma type update pending
                type: "otp",
                attempts: 0,
                metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
            },
        });

        // Send OTP email
        const emailResult = await sendEmail({
            to: email,
            subject: "Your Verification Code",
            html: generateOTPEmailHTML({
                email,
                otp,
                expiryMinutes: OTP_EXPIRY_MINUTES,
            }),
            text: generateOTPEmailText({
                email,
                otp,
                expiryMinutes: OTP_EXPIRY_MINUTES,
            }),
        });

        if (!emailResult.success) {
            // Clean up the token if email failed to send
            await prisma.verificationToken.deleteMany({
                where: {
                    identifier: email,
                    token: hashedOTP,
                },
            });

            return {
                success: false,
                error: "Failed to send OTP email. Please try again.",
            };
        }

        return {
            success: true,
            expiresIn: OTP_EXPIRY_MINUTES * 60, // Convert to seconds
        };
    } catch (error) {
        console.error("Error sending OTP:", error);
        return {
            success: false,
            error: "An error occurred while sending OTP. Please try again.",
        };
    }
}

/**
 * Verifies an OTP for the given email address
 * 
 * @param email - Email address to verify OTP for
 * @param otp - OTP to verify
 * @returns Result indicating success or failure
 */
export async function verifyOTP(email: string, otp: string): Promise<OTPResult> {
    try {
        // Find all valid OTP tokens for this email
        const tokens = await prisma.verificationToken.findMany({
            where: {
                identifier: email,
                // @ts-ignore - Prisma type update pending
                type: "otp",
                expires: {
                    gt: new Date(), // Not expired
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        if (tokens.length === 0) {
            return {
                success: false,
                error: "OTP expired or not found. Please request a new one.",
            };
        }

        // Try to verify against each token (most recent first)
        for (const token of tokens) {
            // Check if max attempts exceeded
            // @ts-ignore - Prisma type update pending
            if (token.attempts >= OTP_MAX_ATTEMPTS) {
                continue; // Skip this token, try next one
            }

            // Compare the provided OTP with the hashed token
            const isValid = await compare(otp, token.token);

            if (isValid) {
                // OTP is valid - delete all OTP tokens for this email
                await prisma.verificationToken.deleteMany({
                    where: {
                        identifier: email,
                        // @ts-ignore - Prisma type update pending
                        type: "otp",
                    },
                });

                return {
                    success: true,
                };
            } else {
                // Increment attempts
                await prisma.verificationToken.update({
                    where: {
                        identifier_token: {
                            identifier: token.identifier,
                            token: token.token,
                        },
                    },
                    data: {
                        // @ts-ignore - Prisma type update pending
                        attempts: {
                            increment: 1,
                        },
                    },
                });
            }
        }

        return {
            success: false,
            error: "Invalid OTP. Please try again.",
        };
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return {
            success: false,
            error: "An error occurred while verifying OTP. Please try again.",
        };
    }
}

/**
 * Cleans up expired OTP tokens
 * This should be run periodically (e.g., via a cron job)
 * 
 * @returns Number of deleted tokens
 */
export async function cleanupExpiredOTPs(): Promise<number> {
    try {
        const result = await prisma.verificationToken.deleteMany({
            where: {
                // @ts-ignore - Prisma type update pending
                type: "otp",
                expires: {
                    lt: new Date(),
                },
            },
        });

        return result.count;
    } catch (error) {
        console.error("Error cleaning up expired OTPs:", error);
        return 0;
    }
}

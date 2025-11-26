import { z } from "zod";

/**
 * Schema for OTP send request
 */
export const SendOTPSchema = z.object({
    email: z
        .string()
        .email("Please enter a valid email address")
        .toLowerCase()
        .trim(),
});

/**
 * Schema for OTP verification request
 */
export const VerifyOTPSchema = z.object({
    email: z
        .string()
        .email("Please enter a valid email address")
        .toLowerCase()
        .trim(),
    otp: z
        .string()
        .length(6, "OTP must be 6 digits")
        .regex(/^\d{6}$/, "OTP must contain only numbers"),
});

/**
 * Type exports for the validation schemas
 */
export type SendOTPRequest = z.infer<typeof SendOTPSchema>;
export type VerifyOTPRequest = z.infer<typeof VerifyOTPSchema>;

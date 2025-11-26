import { z } from "zod";

/**
 * Environment variables schema with validation
 * This ensures all required environment variables are present and valid
 */
const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
    DIRECT_URL: z.string().url("DIRECT_URL must be a valid URL").optional(),

    // NextAuth
    NEXTAUTH_SECRET: z
        .string()
        .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
    NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

    // Google OAuth
    GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
    GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

    // Application
    NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),

    // Node Environment
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),

    // Next.js Phase (used during build)
    NEXT_PHASE: z.string().optional(),
});

/**
 * Validated and typed environment variables
 * Only validate in non-build phases to avoid build failures
 */
const getValidatedEnv = () => {
    // Skip validation during build phase
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

    if (isBuildPhase) {
        console.warn(
            "⚠️  Environment validation skipped during build phase. Ensure variables are set in production."
        );
        return process.env as z.infer<typeof envSchema>;
    }

    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.issues
                .map((err) => `  - ${err.path.join(".")}: ${err.message}`)
                .join("\n");

            console.error(
                `❌ Invalid environment variables:\n${missingVars}\n\nPlease check your .env file.`
            );

            // In development, provide helpful message
            if (process.env.NODE_ENV === "development") {
                console.error("\n💡 Copy env.example to .env and fill in the values.");
            }

            throw new Error("Environment validation failed");
        }
        throw error;
    }
};

export const env = getValidatedEnv();

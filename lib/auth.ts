import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { sendOTP } from "@/lib/auth/otp-service";

function getGoogleProvider() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // During build phase, allow missing credentials to prevent build failures
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  if (!clientId || !clientSecret) {
    if (isBuildPhase) {
      console.warn(
        "Warning: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set during build. Google auth will not work until configured."
      );
      // Return a minimal provider config that won't break the build
      // but will fail at runtime if actually used
      return GoogleProvider({
        clientId: "placeholder",
        clientSecret: "placeholder",
      });
    }
    throw new Error(
      "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables."
    );
  }

  return GoogleProvider({
    clientId,
    clientSecret,
  });
}

const googleProvider = getGoogleProvider();

// Email provider configuration with custom OTP verification
const emailProvider = EmailProvider({
  from: process.env.EMAIL_FROM || "noreply@localhost",
  // Override the default magic link behavior with our OTP system
  sendVerificationRequest: async ({ identifier: email }) => {
    // Use our custom OTP service instead of the default magic link
    await sendOTP(email);
  },
  // Customize the email verification process
  maxAge: 10 * 60, // 10 minutes (matches OTP expiry)
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [googleProvider, emailProvider],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const memberships = await prisma.membership.findMany({
          where: { userId: user.id },
          select: {
            organizationId: true,
            role: true,
          },
        });

        token.organizationRoles = memberships.map((membership) => ({
          organizationId: membership.organizationId,
          role: membership.role,
        }));
      }

      return token;
    },
    async session({ session, token, user }) {
      if (!session.user) {
        return session;
      }

      const resolvedUserId =
        token?.sub ??
        user?.id ??
        session.user.id ??
        (session.user.email
          ? (
            await prisma.user.findUnique({
              where: { email: session.user.email },
              select: { id: true },
            })
          )?.id
          : undefined);

      if (resolvedUserId) {
        session.user.id = resolvedUserId;
      }

      if (token?.organizationRoles) {
        session.user.organizationRoles = token.organizationRoles as Array<{
          organizationId: string;
          role: string;
        }>;
        return session;
      }

      if (!resolvedUserId) {
        session.user.organizationRoles = [];
        return session;
      }

      const memberships = await prisma.membership.findMany({
        where: { userId: resolvedUserId },
        select: {
          organizationId: true,
          role: true,
        },
      });

      session.user.organizationRoles = memberships.map((membership) => ({
        organizationId: membership.organizationId,
        role: membership.role,
      }));

      return session;
    },
  },
};

// Wrap auth with React cache to ensure getServerSession runs once per request
export const auth = cache(() => getServerSession(authOptions));


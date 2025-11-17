import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

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

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [googleProvider],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}


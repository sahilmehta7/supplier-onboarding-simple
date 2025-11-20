import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { auth } from "@/lib/auth";
import { AuthProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/toaster";
import { SkipLinks } from "@/components/navigation/skip-links";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Supplier Hub",
  description: "Internal supplier onboarding workspace",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SkipLinks />
        <NuqsAdapter>
          <AuthProvider session={session}>{children}</AuthProvider>
        </NuqsAdapter>
        <Toaster />
      </body>
    </html>
  );
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for smaller, more efficient deployments on Vercel
  output: "standalone",

  // Optimize images for better performance
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },

  // Reduce bundle size by removing console logs in production
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Optimize serverless function size and performance
  experimental: {
    serverMinification: true,
    serverSourceMaps: false,
  },
};

export default nextConfig;

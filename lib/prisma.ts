import { PrismaClient } from "@prisma/client";

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

// Create Prisma client with serverless optimizations
const createPrismaClient = () => {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  // Add query monitoring in production to detect slow queries
  if (process.env.NODE_ENV === "production") {
    return client.$extends({
      query: {
        async $allOperations({ operation, model, args, query }) {
          const before = Date.now();
          const result = await query(args);
          const after = Date.now();
          const duration = after - before;
          
          // Log slow queries (>1000ms)
          if (duration > 1000) {
            console.warn(
              `[Prisma] Slow query detected (${duration}ms): ${model}.${operation}`
            );
          }
          
          return result;
        },
      },
    });
  }

  return client;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}


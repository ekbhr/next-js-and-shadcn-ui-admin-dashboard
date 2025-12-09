import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// For Prisma 7, when using engine type "client", we need to provide either:
// 1. accelerateUrl for Prisma Accelerate
// 2. adapter for edge runtime
// 3. Or use direct database connection (which uses different engine)
// We'll use the direct DATABASE_URL connection for now
export const prisma =
  globalForPrisma.prisma ??
  (() => {
    try {
      // For Prisma 7, when using engine type "client", we need accelerateUrl or adapter
      // Use Accelerate if PRISMA_DATABASE_URL is available
      const accelerateUrl = process.env.PRISMA_DATABASE_URL;
      
      if (accelerateUrl) {
        // PRISMA_DATABASE_URL format: prisma+postgres://accelerate.prisma-data.net/?api_key=...
        // Prisma requires the URL to start with prisma:// or prisma+postgres://
        return new PrismaClient({
          accelerateUrl, // Use the full URL as-is (must start with prisma:// or prisma+postgres://)
          log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
        });
      } else if (process.env.DATABASE_URL) {
        // For direct connection without Accelerate, we might need to use a different approach
        // Try using DATABASE_URL directly - Prisma 7 should handle it
        return new PrismaClient({
          log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
        });
      } else {
        throw new Error("Either DATABASE_URL or PRISMA_DATABASE_URL must be set");
      }
    } catch (error) {
      console.error("Failed to initialize Prisma Client:", error);
      throw error;
    }
  })();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}


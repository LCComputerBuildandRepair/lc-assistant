import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 connects through a driver adapter. We use Postgres (Neon) so the app
// runs on serverless hosts like Netlify. DATABASE_URL is the Neon connection
// string — use the POOLED connection string for serverless.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

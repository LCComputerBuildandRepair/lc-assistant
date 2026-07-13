import { defineConfig } from "prisma/config";

// Prisma 7 moved the datasource URL out of schema.prisma. The CLI (migrate,
// db push, studio) reads it from here. Paths resolve relative to the project root.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});

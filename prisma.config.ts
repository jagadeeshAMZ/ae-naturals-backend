// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    // Adding -r dotenv/config ensures the seed script sees your DB_URL immediately
    seed: 'ts-node -r dotenv/config prisma/seed.ts',
  }
});
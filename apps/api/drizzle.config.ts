import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL || "brightloop.db";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: dbUrl,
  },
});

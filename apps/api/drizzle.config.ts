import { defineConfig } from "drizzle-kit";

const useSSL = process.env.DATABASE_SSL === "true";

export default defineConfig({
  schema: "./src/db/schema/",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
  },
});

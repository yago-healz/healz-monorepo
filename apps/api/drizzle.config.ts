import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL!;
const isLocalDb =
  dbUrl?.includes("localhost") || dbUrl?.includes("127.0.0.1");
const sslUrl =
  isLocalDb || !dbUrl
    ? dbUrl
    : `${dbUrl}${dbUrl.includes("?") ? "&" : "?"}sslmode=require`;

export default defineConfig({
  schema: "./src/db/schema/",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: sslUrl,
  },
});

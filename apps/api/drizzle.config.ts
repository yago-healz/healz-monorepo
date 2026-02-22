import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL!;
const isLocalDb =
  dbUrl?.includes("localhost") || dbUrl?.includes("127.0.0.1");
const sslUrl =
  isLocalDb || !dbUrl
    ? dbUrl
    : `${dbUrl}${dbUrl.includes("?") ? "&" : "?"}uselibpqcompat=true&sslmode=require`;

export default defineConfig({
  schema: "./src/infrastructure/database/schema/",
  out: "./src/infrastructure/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: sslUrl,
  },
});

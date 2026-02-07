import { jsonb, pgTable, timestamp, uuid, varchar, integer } from "drizzle-orm/pg-core";
import { users } from "./auth.schema";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  organizationId: uuid("organization_id"),
  clinicId: uuid("clinic_id"),
  action: varchar("action", { length: 50 }).notNull(), // LOGIN, LOGIN_FAILED, LOGOUT, READ, CREATE, UPDATE, DELETE
  resource: varchar("resource", { length: 500 }).notNull(), // URL path
  method: varchar("method", { length: 10 }).notNull(), // GET, POST, PUT, PATCH, DELETE
  statusCode: integer("status_code"),
  ip: varchar("ip", { length: 45 }), // supports IPv4 and IPv6
  userAgent: varchar("user_agent", { length: 500 }),
  metadata: jsonb("metadata"), // flexible for additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

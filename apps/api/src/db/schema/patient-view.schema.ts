import { pgTable, uuid, varchar, date, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

export const patientView = pgTable("patient_view", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  clinicId: uuid("clinic_id").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  fullName: varchar("full_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  birthDate: date("birth_date"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex("patient_view_phone_tenant_unique").on(table.phone, table.tenantId),
  index("idx_patient_view_tenant").on(table.tenantId),
  index("idx_patient_view_clinic").on(table.clinicId),
  index("idx_patient_view_status").on(table.status),
]);

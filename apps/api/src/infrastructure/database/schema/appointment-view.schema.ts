import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const appointmentView = pgTable(
  "appointment_view",
  {
    id: uuid("id").primaryKey(),
    patientId: uuid("patient_id").notNull(),
    tenantId: uuid("tenant_id").notNull(),
    clinicId: uuid("clinic_id").notNull(),
    doctorId: uuid("doctor_id").notNull(),

    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    duration: integer("duration").notNull(), // minutos
    status: varchar("status", { length: 20 }).notNull().default("scheduled"),

    reason: text("reason"),
    notes: text("notes"),

    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_appointment_patient").on(table.patientId),
    index("idx_appointment_clinic").on(table.clinicId),
    index("idx_appointment_doctor").on(table.doctorId),
    index("idx_appointment_scheduled_at").on(table.scheduledAt),
    index("idx_appointment_status").on(table.status),
    // Indice composto para buscar conflitos de horario
    index("idx_appointment_doctor_time").on(table.doctorId, table.scheduledAt),
  ],
);

import {
  pgTable,
  uuid,
  varchar,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const patientJourneyView = pgTable(
  "patient_journey_view",
  {
    id: uuid("id").primaryKey(),
    patientId: uuid("patient_id").notNull(),
    tenantId: uuid("tenant_id").notNull(),
    clinicId: uuid("clinic_id").notNull(),

    currentStage: varchar("current_stage", { length: 50 })
      .notNull()
      .default("lead"),
    riskScore: integer("risk_score").notNull().default(0),
    riskLevel: varchar("risk_level", { length: 20 }).notNull().default("low"),

    milestones: jsonb("milestones").notNull().default([]),
    stageHistory: jsonb("stage_history").notNull().default([]),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_journey_patient").on(table.patientId),
    index("idx_journey_clinic").on(table.clinicId),
    index("idx_journey_stage").on(table.currentStage),
    index("idx_journey_risk_level").on(table.riskLevel),
    index("idx_journey_risk_score").on(table.riskScore),
  ],
);

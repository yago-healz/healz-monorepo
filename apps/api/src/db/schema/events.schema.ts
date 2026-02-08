import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    // Identificacao
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventId: uuid("event_id").notNull().unique().defaultRandom(),
    eventType: varchar("event_type", { length: 100 }).notNull(),

    // Agregado
    aggregateType: varchar("aggregate_type", { length: 50 }).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    aggregateVersion: integer("aggregate_version").notNull(),

    // Multi-tenant
    tenantId: uuid("tenant_id").notNull(),
    clinicId: uuid("clinic_id"),

    // Rastreabilidade
    causationId: varchar("causation_id", { length: 255 }),
    correlationId: varchar("correlation_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 255 }),

    // Timestamp
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Dados
    eventData: jsonb("event_data").notNull(),
    metadata: jsonb("metadata").default({}),
  },
  (table) => [
    // Optimistic locking: aggregate_id + version deve ser unico
    uniqueIndex("events_aggregate_version_unique").on(
      table.aggregateId,
      table.aggregateVersion,
    ),

    // Indices para queries comuns
    index("idx_events_aggregate").on(table.aggregateType, table.aggregateId),
    index("idx_events_correlation").on(table.correlationId),
    index("idx_events_causation").on(table.causationId),
    index("idx_events_tenant").on(table.tenantId),
    index("idx_events_type").on(table.eventType),
    index("idx_events_created_at").on(table.createdAt),
  ],
);

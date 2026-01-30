# Modelagem de Dados - Healz

## Visão Geral

Este documento detalha a estratégia completa de modelagem de dados do Healz, incluindo o modelo híbrido que combina Event Sourcing com Read Models otimizados, schemas do Drizzle ORM, e estratégias de performance.

Para informações sobre Event Store, veja [DATABASE.MD](./DATABASE.MD).  
Para arquitetura multi-tenant, veja [MULTI_TENANT_DEEP_DIVE.md](./MULTI_TENANT_DEEP_DIVE.md).

---

## Arquitetura de Dados: Hybrid Approach

O Healz utiliza uma abordagem híbrida que combina o melhor dos dois mundos:

```
┌─────────────────────────────────────────────────────────────┐
│                    WRITE SIDE (Commands)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │  Aggregate   │ ─────→  │ Event Store  │                 │
│  │   (Memory)   │         │ (PostgreSQL) │                 │
│  └──────────────┘         └──────┬───────┘                 │
│                                   │                          │
└───────────────────────────────────┼──────────────────────────┘
                                    │
                                    │ Event Published
                                    ↓
                            ┌───────────────┐
                            │   Event Bus   │
                            │  (BullMQ)     │
                            └───────┬───────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
┌─────────────────────────────────────────────────────────────┐
│                    READ SIDE (Queries)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐         │
│  │ Projection │   │ Projection │   │ Projection │         │
│  │ PatientView│   │ Appointment│   │  Journey   │         │
│  └────────────┘   └────────────┘   └────────────┘         │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │        Read Models (PostgreSQL)              │          │
│  │     - Denormalized                            │          │
│  │     - Optimized for queries                   │          │
│  │     - Fast reads                              │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Por que Híbrido?

| Aspecto          | Event Store (Write)           | Read Models (Queries)      |
| ---------------- | ----------------------------- | -------------------------- |
| **Propósito**    | Fonte da verdade, auditoria   | Performance em leituras    |
| **Estrutura**    | Normalizada, imutável         | Denormalizada, mutável     |
| **Otimização**   | Writes + append-only          | Reads + indexes            |
| **Consistência** | Sempre consistente            | Eventually consistent      |
| **Exemplo**      | Histórico completo de eventos | Dashboard com estatísticas |

---

## Schema Drizzle: Event Store

### Tabela: events

```typescript
// packages/backend/src/database/schema/events.schema.ts

import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  bigserial,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    // Primary key sequencial para performance
    id: bigserial("id", { mode: "number" }).primaryKey(),

    // Identificadores
    eventId: uuid("event_id").notNull().unique(),
    eventType: varchar("event_type", { length: 255 }).notNull(),

    // Dados do evento
    eventData: jsonb("event_data").notNull(),

    // Agregado que gerou o evento
    aggregateType: varchar("aggregate_type", { length: 100 }).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    aggregateVersion: integer("aggregate_version").notNull(),

    // Multi-tenancy
    tenantId: uuid("tenant_id").notNull(),
    clinicId: uuid("clinic_id"),

    // Rastreabilidade
    causationId: uuid("causation_id"), // Evento que causou este
    correlationId: uuid("correlation_id").notNull(), // Agrupa operação
    userId: uuid("user_id"), // Quem iniciou

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Metadados flexíveis
    metadata: jsonb("metadata"),
  },
  (table) => ({
    // Índices estratégicos
    aggregateIdx: index("events_aggregate_idx").on(
      table.aggregateId,
      table.aggregateVersion,
    ),
    tenantCreatedIdx: index("events_tenant_created_idx").on(
      table.tenantId,
      table.createdAt,
    ),
    eventTypeIdx: index("events_type_idx").on(table.eventType, table.createdAt),
    correlationIdx: index("events_correlation_idx").on(
      table.correlationId,
      table.createdAt,
    ),
    clinicIdx: index("events_clinic_idx").on(table.clinicId, table.createdAt),
  }),
);

// Tipo inferido do schema
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

### Constraints Adicionais (SQL)

```sql
-- Garante versão única por agregado (optimistic locking)
ALTER TABLE events ADD CONSTRAINT events_aggregate_version_unique
  UNIQUE (aggregate_id, aggregate_version);

-- Garante que correlation_id nunca seja NULL
ALTER TABLE events ADD CONSTRAINT events_correlation_not_null
  CHECK (correlation_id IS NOT NULL);

-- Índice GIN para queries em JSONB
CREATE INDEX events_event_data_gin ON events USING GIN (event_data);
CREATE INDEX events_metadata_gin ON events USING GIN (metadata);
```

---

## Schema Drizzle: Read Models

### 1. PatientView (Read Model)

**Propósito**: View otimizada para listagem e busca de pacientes

```typescript
// packages/backend/src/database/schema/patient-view.schema.ts

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  decimal,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const patientView = pgTable(
  "patient_view",
  {
    // Identificação
    patientId: uuid("patient_id").primaryKey(),
    tenantId: uuid("tenant_id").notNull(),

    // Dados básicos
    phone: varchar("phone", { length: 20 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    birthDate: timestamp("birth_date"),
    cpf: varchar("cpf", { length: 14 }),

    // Status e Jornada
    status: varchar("status", { length: 50 }).notNull(), // active, inactive, suspended
    currentJourneyStage: varchar("current_journey_stage", { length: 50 }), // scheduled, at_risk, etc
    riskScore: decimal("risk_score", { precision: 3, scale: 2 }), // 0.00 - 1.00

    // Estatísticas agregadas
    totalAppointments: integer("total_appointments").notNull().default(0),
    completedAppointments: integer("completed_appointments")
      .notNull()
      .default(0),
    cancelledAppointments: integer("cancelled_appointments")
      .notNull()
      .default(0),
    noShowCount: integer("no_show_count").notNull().default(0),

    // Interações
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
    interactionCount: integer("interaction_count").notNull().default(0),

    // Datas importantes
    firstContactAt: timestamp("first_contact_at", { withTimezone: true }),
    lastAppointmentAt: timestamp("last_appointment_at", { withTimezone: true }),
    nextAppointmentAt: timestamp("next_appointment_at", { withTimezone: true }),

    // Preferências (denormalizado para performance)
    preferredClinicId: uuid("preferred_clinic_id"),
    preferredDoctorId: uuid("preferred_doctor_id"),

    // Dados flexíveis
    address: jsonb("address"),
    preferences: jsonb("preferences"),

    // Timestamps de controle
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Índices para queries comuns
    tenantIdx: index("patient_view_tenant_idx").on(table.tenantId),
    phoneIdx: index("patient_view_phone_idx").on(table.tenantId, table.phone),
    nameIdx: index("patient_view_name_idx").on(table.fullName),
    stageIdx: index("patient_view_stage_idx").on(table.currentJourneyStage),
    riskIdx: index("patient_view_risk_idx").on(table.riskScore),
    lastInteractionIdx: index("patient_view_last_interaction_idx").on(
      table.lastInteractionAt,
    ),
  }),
);

export type PatientView = typeof patientView.$inferSelect;
```

### 2. AppointmentView (Read Model)

**Propósito**: View otimizada para calendários e listagens de agendamentos

```typescript
// packages/backend/src/database/schema/appointment-view.schema.ts

export const appointmentView = pgTable(
  "appointment_view",
  {
    // Identificação
    appointmentId: uuid("appointment_id").primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    clinicId: uuid("clinic_id").notNull(),

    // Relacionamentos (denormalizados)
    patientId: uuid("patient_id").notNull(),
    patientName: varchar("patient_name", { length: 255 }).notNull(),
    patientPhone: varchar("patient_phone", { length: 20 }).notNull(),

    doctorId: uuid("doctor_id").notNull(),
    doctorName: varchar("doctor_name", { length: 255 }).notNull(),

    // Agendamento
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    duration: integer("duration").notNull(), // em minutos

    // Status e Confirmação
    status: varchar("status", { length: 50 }).notNull(), // scheduled, confirmed, cancelled, completed, no_show
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    confirmedBy: varchar("confirmed_by", { length: 50 }), // patient, agent, system
    confirmationMethod: varchar("confirmation_method", { length: 50 }), // whatsapp, phone, dashboard

    // Cancelamento
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: varchar("cancellation_reason", { length: 500 }),

    // Conclusão
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: varchar("notes", { length: 2000 }),

    // Remarcações
    rescheduledCount: integer("rescheduled_count").notNull().default(0),
    originalScheduledFor: timestamp("original_scheduled_for", {
      withTimezone: true,
    }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Índices para calendário
    tenantClinicDateIdx: index("appointment_view_tenant_clinic_date_idx").on(
      table.tenantId,
      table.clinicId,
      table.scheduledFor,
    ),
    doctorDateIdx: index("appointment_view_doctor_date_idx").on(
      table.doctorId,
      table.scheduledFor,
    ),
    patientIdx: index("appointment_view_patient_idx").on(table.patientId),
    statusIdx: index("appointment_view_status_idx").on(
      table.status,
      table.scheduledFor,
    ),
  }),
);

export type AppointmentView = typeof appointmentView.$inferSelect;
```

### 3. JourneyView (Read Model)

**Propósito**: View otimizada para dashboards de risco e acompanhamento

```typescript
// packages/backend/src/database/schema/journey-view.schema.ts

export const journeyView = pgTable(
  "journey_view",
  {
    // Identificação
    journeyId: uuid("journey_id").primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    clinicId: uuid("clinic_id").notNull(),
    patientId: uuid("patient_id").notNull(),

    // Estado atual
    currentStage: varchar("current_stage", { length: 50 }).notNull(),
    previousStage: varchar("previous_stage", { length: 50 }),
    stageChangedAt: timestamp("stage_changed_at", {
      withTimezone: true,
    }).notNull(),

    // Risco
    riskScore: decimal("risk_score", { precision: 3, scale: 2 })
      .notNull()
      .default("0.00"),
    riskLevel: varchar("risk_level", { length: 20 }).notNull(), // low, medium, high, critical
    riskIndicators: jsonb("risk_indicators").notNull().default("[]"),
    lastRiskCalculatedAt: timestamp("last_risk_calculated_at", {
      withTimezone: true,
    }),

    // Métricas de tempo
    daysSinceFirstContact: integer("days_since_first_contact"),
    daysSinceLastInteraction: integer("days_since_last_interaction"),
    daysSinceLastAppointment: integer("days_since_last_appointment"),
    daysUntilNextAppointment: integer("days_until_next_appointment"),

    // Estatísticas do paciente na jornada
    totalInteractions: integer("total_interactions").notNull().default(0),
    totalAppointments: integer("total_appointments").notNull().default(0),
    missedAppointments: integer("missed_appointments").notNull().default(0),

    // Flags importantes
    isActive: boolean("is_active").notNull().default(true),
    needsFollowUp: boolean("needs_follow_up").notNull().default(false),
    hasEscalation: boolean("has_escalation").notNull().default(false),

    // Dados denormalizados para dashboard
    patientName: varchar("patient_name", { length: 255 }).notNull(),
    patientPhone: varchar("patient_phone", { length: 20 }).notNull(),

    // Timestamps
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Índices para dashboards
    tenantClinicIdx: index("journey_view_tenant_clinic_idx").on(
      table.tenantId,
      table.clinicId,
    ),
    stageIdx: index("journey_view_stage_idx").on(
      table.currentStage,
      table.isActive,
    ),
    riskIdx: index("journey_view_risk_idx").on(table.riskLevel, table.isActive),
    patientIdx: index("journey_view_patient_idx").on(table.patientId),
    needsFollowUpIdx: index("journey_view_follow_up_idx").on(
      table.needsFollowUp,
      table.isActive,
    ),
  }),
);

export type JourneyView = typeof journeyView.$inferSelect;
```

---

## Projections: Event → Read Model

### Como Funcionam as Projections

```typescript
// packages/backend/src/projections/patient-view.projection.ts

import { EventBus } from "../event-bus";
import { db } from "../database/connection";
import { patientView } from "../database/schema";
import { eq } from "drizzle-orm";

export class PatientViewProjection {
  constructor(private eventBus: EventBus) {
    this.registerHandlers();
  }

  private registerHandlers() {
    // Registra handlers para eventos relevantes
    this.eventBus.on("PatientRegistered", this.handlePatientRegistered);
    this.eventBus.on("AppointmentScheduled", this.handleAppointmentScheduled);
    this.eventBus.on("AppointmentCompleted", this.handleAppointmentCompleted);
    this.eventBus.on("MessageReceived", this.handleMessageReceived);
    this.eventBus.on("JourneyStageChanged", this.handleJourneyStageChanged);
    this.eventBus.on("RiskScoreRecalculated", this.handleRiskScoreRecalculated);
  }

  private handlePatientRegistered = async (event: DomainEvent) => {
    const { patient_id, phone, full_name, email, tenant_id } = event.event_data;

    await db.insert(patientView).values({
      patientId: patient_id,
      tenantId: tenant_id,
      phone,
      fullName: full_name,
      email,
      status: "active",
      firstContactAt: event.created_at,
      lastInteractionAt: event.created_at,
      interactionCount: 1,
    });
  };

  private handleAppointmentScheduled = async (event: DomainEvent) => {
    const { patient_id, scheduled_for } = event.event_data;

    await db
      .update(patientView)
      .set({
        totalAppointments: sql`${patientView.totalAppointments} + 1`,
        nextAppointmentAt: scheduled_for,
        updatedAt: new Date(),
      })
      .where(eq(patientView.patientId, patient_id));
  };

  private handleAppointmentCompleted = async (event: DomainEvent) => {
    const { patient_id } = event.event_data;

    await db
      .update(patientView)
      .set({
        completedAppointments: sql`${patientView.completedAppointments} + 1`,
        lastAppointmentAt: event.created_at,
        updatedAt: new Date(),
      })
      .where(eq(patientView.patientId, patient_id));
  };

  private handleMessageReceived = async (event: DomainEvent) => {
    const { patient_id } = event.event_data;

    await db
      .update(patientView)
      .set({
        lastInteractionAt: event.created_at,
        interactionCount: sql`${patientView.interactionCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(patientView.patientId, patient_id));
  };

  private handleJourneyStageChanged = async (event: DomainEvent) => {
    const { patient_id, new_stage } = event.event_data;

    await db
      .update(patientView)
      .set({
        currentJourneyStage: new_stage,
        updatedAt: new Date(),
      })
      .where(eq(patientView.patientId, patient_id));
  };

  private handleRiskScoreRecalculated = async (event: DomainEvent) => {
    const { patient_id, new_score } = event.event_data;

    await db
      .update(patientView)
      .set({
        riskScore: new_score.toString(),
        updatedAt: new Date(),
      })
      .where(eq(patientView.patientId, patient_id));
  };
}
```

### Idempotência nas Projections

**Problema**: Eventos podem ser processados mais de uma vez (at-least-once delivery)

**Solução**: Projections devem ser idempotentes

```typescript
// Estratégia 1: Upsert com event_id tracking
await db
  .insert(patientView)
  .values({
    patientId: patient_id,
    // ... outros campos
  })
  .onConflictDoUpdate({
    target: patientView.patientId,
    set: {
      // Atualiza apenas se evento é mais recente
      fullName: sql`CASE WHEN ${patientView.updatedAt} < ${event.created_at} THEN ${full_name} ELSE ${patientView.fullName} END`,
    },
  });

// Estratégia 2: Tabela de eventos processados
await db.transaction(async (tx) => {
  // Verifica se já processou
  const processed = await tx
    .select()
    .from(processedEvents)
    .where(eq(processedEvents.eventId, event.event_id));

  if (processed.length > 0) return; // Já processado

  // Processa
  await tx.update(patientView).set({ ... });

  // Marca como processado
  await tx.insert(processedEvents).values({
    eventId: event.event_id,
    projectionName: 'PatientViewProjection',
    processedAt: new Date(),
  });
});
```

---

## Estratégias de Performance

### 1. Particionamento da Tabela `events`

**Quando aplicar**: Quando ultrapassar 10 milhões de eventos

```sql
-- Particionamento por mês
CREATE TABLE events (
  -- ... colunas
) PARTITION BY RANGE (created_at);

-- Criar partições
CREATE TABLE events_2025_01 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE events_2025_02 PARTITION OF events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Automatizar criação de partições futuras
CREATE EXTENSION IF NOT EXISTS pg_partman;
```

### 2. Índices Parciais

```sql
-- Apenas eventos recentes dos últimos 30 dias
CREATE INDEX events_recent_idx ON events (tenant_id, created_at)
  WHERE created_at > NOW() - INTERVAL '30 days';

-- Apenas journeys ativos
CREATE INDEX journey_view_active_risk_idx ON journey_view (risk_level, risk_score)
  WHERE is_active = true;
```

### 3. Materialized Views para Analytics

```sql
-- Dashboard de métricas agregadas
CREATE MATERIALIZED VIEW clinic_metrics_daily AS
SELECT
  clinic_id,
  DATE(scheduled_for) as date,
  COUNT(*) as total_appointments,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
  AVG(EXTRACT(EPOCH FROM (completed_at - scheduled_for))/60) as avg_delay_minutes
FROM appointment_view
WHERE scheduled_for >= NOW() - INTERVAL '90 days'
GROUP BY clinic_id, DATE(scheduled_for);

-- Refresh periódico (via cron job)
REFRESH MATERIALIZED VIEW CONCURRENTLY clinic_metrics_daily;
```

### 4. Connection Pooling com Drizzle

```typescript
// packages/backend/src/database/connection.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // Pool configuration
  max: 20, // Máximo de conexões
  min: 5, // Mínimo de conexões mantidas
  idleTimeoutMillis: 30000, // Timeout para conexão idle
  connectionTimeoutMillis: 2000, // Timeout para obter conexão
});

export const db = drizzle(pool);
```

---

## Rebuilding Read Models

### Cenário: Projection Bug ou Schema Change

```typescript
// packages/backend/src/scripts/rebuild-projection.ts

async function rebuildPatientView() {
  console.log("Starting PatientView rebuild...");

  // 1. Limpar read model atual
  await db.delete(patientView);

  // 2. Reprocessar TODOS os eventos em ordem
  const events = await db
    .select()
    .from(events)
    .where(
      inArray(events.eventType, [
        "PatientRegistered",
        "AppointmentScheduled",
        "AppointmentCompleted",
        "MessageReceived",
        "JourneyStageChanged",
        "RiskScoreRecalculated",
      ]),
    )
    .orderBy(events.createdAt);

  // 3. Aplicar projection handlers
  const projection = new PatientViewProjection(eventBus);

  for (const event of events) {
    await projection.handle(event);
  }

  console.log(`Rebuilt PatientView with ${events.length} events`);
}
```

### Rebuild Incremental

```typescript
// Rebuild apenas de um tenant específico
async function rebuildPatientViewForTenant(tenantId: string) {
  // Limpar apenas deste tenant
  await db.delete(patientView).where(eq(patientView.tenantId, tenantId));

  // Reprocessar eventos deste tenant
  const events = await db
    .select()
    .from(events)
    .where(eq(events.tenantId, tenantId))
    .orderBy(events.createdAt);

  // Aplicar handlers...
}
```

---

## Queries Comuns com Drizzle

### 1. Buscar Pacientes em Risco

```typescript
// packages/backend/src/repositories/patient.repository.ts

async getPatientsAtRisk(tenantId: string, clinicId?: string) {
  let query = db
    .select()
    .from(patientView)
    .where(
      and(
        eq(patientView.tenantId, tenantId),
        eq(patientView.currentJourneyStage, 'at_risk'),
        gte(patientView.riskScore, '0.7')
      )
    )
    .orderBy(desc(patientView.riskScore));

  if (clinicId) {
    query = query.where(eq(patientView.preferredClinicId, clinicId));
  }

  return query;
}
```

### 2. Calendário de Agendamentos

```typescript
async getAppointmentsForDate(
  clinicId: string,
  date: Date
) {
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  return db
    .select()
    .from(appointmentView)
    .where(
      and(
        eq(appointmentView.clinicId, clinicId),
        gte(appointmentView.scheduledFor, startOfDay),
        lte(appointmentView.scheduledFor, endOfDay),
        inArray(appointmentView.status, ['scheduled', 'confirmed'])
      )
    )
    .orderBy(appointmentView.scheduledFor);
}
```

### 3. Histórico Completo de um Paciente

```typescript
async getPatientHistory(patientId: string) {
  return db
    .select()
    .from(events)
    .where(
      or(
        eq(events.aggregateId, patientId),
        sql`${events.eventData}->>'patient_id' = ${patientId}`
      )
    )
    .orderBy(events.createdAt);
}
```

### 4. Dashboard de Métricas

```typescript
async getClinicDashboardMetrics(clinicId: string, period: 'day' | 'week' | 'month') {
  const intervals = {
    day: '1 day',
    week: '7 days',
    month: '30 days',
  };

  return db
    .select({
      totalPatients: count(patientView.patientId),
      activeJourneys: count(journeyView.journeyId).where(journeyView.isActive),
      patientsAtRisk: count(patientView.patientId).where(
        gte(patientView.riskScore, '0.7')
      ),
      upcomingAppointments: count(appointmentView.appointmentId).where(
        and(
          gte(appointmentView.scheduledFor, new Date()),
          inArray(appointmentView.status, ['scheduled', 'confirmed'])
        )
      ),
    })
    .from(patientView)
    .leftJoin(journeyView, eq(patientView.patientId, journeyView.patientId))
    .leftJoin(appointmentView, eq(patientView.patientId, appointmentView.patientId))
    .where(
      and(
        eq(patientView.preferredClinicId, clinicId),
        gte(
          patientView.lastInteractionAt,
          sql`NOW() - INTERVAL '${sql.raw(intervals[period])}'`
        )
      )
    );
}
```

---

## Migrations com Drizzle Kit

### Configuração

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/database/schema/*.schema.ts",
  out: "./drizzle/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Workflow de Migrations

```bash
# Gerar migration após mudança no schema
npm run db:generate

# Aplicar migrations
npm run db:migrate

# Rollback (manual via SQL)
npm run db:rollback
```

### Exemplo de Migration

```typescript
// drizzle/migrations/0001_add_risk_indicators.sql
-- Add risk_indicators column to journey_view
ALTER TABLE journey_view
ADD COLUMN risk_indicators JSONB NOT NULL DEFAULT '[]';

-- Create index for GIN queries
CREATE INDEX journey_view_risk_indicators_gin
  ON journey_view USING GIN (risk_indicators);
```

---

## Boas Práticas

### ✅ DO

1. **Sempre use transaction para múltiplas writes**

   ```typescript
   await db.transaction(async (tx) => {
     await tx.insert(events).values(event1);
     await tx.insert(events).values(event2);
   });
   ```

2. **Filtre por tenant_id SEMPRE em queries**

   ```typescript
   .where(and(
     eq(table.tenantId, currentTenantId),
     // ... outros filtros
   ))
   ```

3. **Use prepared statements para queries repetidas**

   ```typescript
   const getPatient = db
     .select()
     .from(patientView)
     .where(eq(patientView.patientId, sql.placeholder("patientId")))
     .prepare("get_patient");

   await getPatient.execute({ patientId: "..." });
   ```

4. **Monitore tamanho de event_data**

   ```typescript
   // ❌ Evite
   event_data: {
     full_conversation_history: [...] // Muito grande!
   }

   // ✅ Faça
   event_data: {
     conversation_id: 'conv-123',
     message_count: 5
   }
   ```

### ❌ DON'T

1. **Nunca mutate eventos**

   ```typescript
   // ❌ NUNCA
   await db.update(events).set({ eventData: newData });
   ```

2. **Não faça queries cross-tenant sem justificativa**

   ```typescript
   // ❌ Perigoso
   await db.select().from(patientView); // Sem filtro de tenant!
   ```

3. **Evite N+1 queries**

   ```typescript
   // ❌ N+1
   for (const patient of patients) {
     const appointments = await getAppointments(patient.id);
   }

   // ✅ Batch
   const patientIds = patients.map((p) => p.id);
   const appointments = await getAppointmentsByPatients(patientIds);
   ```

---

## Monitoramento e Observabilidade

### Métricas Importantes

```typescript
// Event Store health
- events.write_latency_p95
- events.write_throughput
- events.table_size_gb

// Projections health
- projection.lag_seconds (evento publicado vs processado)
- projection.error_rate
- projection.processing_time_p95

// Read Models health
- read_model.query_latency_p95
- read_model.cache_hit_rate
```

### Queries de Monitoramento

```sql
-- Tamanho das tabelas
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Índices não utilizados
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey';
```

---

## Documentação Relacionada

- [DATABASE.MD](./DATABASE.MD) - Event Store schema e conceitos
- [MULTI_TENANT_DEEP_DIVE.md](./MULTI_TENANT_DEEP_DIVE.md) - Isolamento de dados
- [PROJECTIONS.md](./PROJECTIONS.md) - Detalhes de cada projection
- [EVENTS.md](./EVENTS.md) - Catálogo completo de eventos

---

## Status

✅ **Completo** - Documento criado em 2025-01-30

Cobre estratégias de modelagem de dados, schemas Drizzle, projections, performance e boas práticas.

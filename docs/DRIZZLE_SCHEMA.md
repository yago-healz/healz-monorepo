# Modelagem de Dados com Drizzle - Healz

## Visão Geral

Este documento especifica a modelagem completa de dados do Healz usando Drizzle ORM, incluindo Event Store, estruturas multi-tenant e Read Models (Projections).

**Princípios:**

- Event Store como fonte da verdade
- Read Models desnormalizados para performance
- Multi-tenancy com Row-Level Security
- Índices estratégicos para queries comuns

---

## Estrutura de Diretórios

```
src/db/
├── schema/
│   ├── event-store.ts      # Event Store
│   ├── organizations.ts    # Multi-tenant core
│   ├── projections.ts      # Read Models
│   └── index.ts            # Exports
├── migrations/             # Drizzle migrations
├── drizzle.service.ts      # Service para injeção
└── drizzle.config.ts       # Configuração
```

---

## Event Store Schema

### Tabela: `events`

**Propósito:** Armazenar todos os eventos do sistema de forma imutável.

```typescript
// src/db/schema/event-store.ts
import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  bigserial,
  timestamp,
  index,
  unique,
  integer,
} from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    // === Identificação ===
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventId: uuid("event_id").defaultRandom().notNull().unique(),
    eventType: varchar("event_type", { length: 255 }).notNull(),

    // === Aggregate Info ===
    aggregateType: varchar("aggregate_type", { length: 100 }).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    aggregateVersion: integer("aggregate_version").notNull(),

    // === Multi-tenancy ===
    tenantId: uuid("tenant_id").notNull(),
    clinicId: uuid("clinic_id"),

    // === Rastreabilidade ===
    causationId: uuid("causation_id"),
    correlationId: uuid("correlation_id").notNull(),
    userId: uuid("user_id"),

    // === Dados ===
    eventData: jsonb("event_data").notNull(),
    metadata: jsonb("metadata"),

    // === Timestamp ===
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Índices estratégicos
    aggregateIdx: index("idx_events_aggregate").on(
      table.aggregateId,
      table.aggregateVersion,
    ),
    tenantIdx: index("idx_events_tenant").on(table.tenantId, table.createdAt),
    eventTypeIdx: index("idx_events_type").on(table.eventType, table.createdAt),
    correlationIdx: index("idx_events_correlation").on(
      table.correlationId,
      table.createdAt,
    ),
    clinicIdx: index("idx_events_clinic").on(table.clinicId, table.createdAt),

    // Unique constraint para optimistic locking
    aggregateVersionUnique: unique("uq_aggregate_version").on(
      table.aggregateId,
      table.aggregateVersion,
    ),
  }),
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

### Uso do Event Store

```typescript
// Exemplo: Append de evento
const newEvent: NewEvent = {
  eventId: crypto.randomUUID(),
  eventType: "PatientRegistered",
  aggregateType: "Patient",
  aggregateId: patientId,
  aggregateVersion: 1,
  tenantId: organizationId,
  clinicId: null,
  causationId: null,
  correlationId: correlationId,
  userId: userId,
  eventData: {
    patient_id: patientId,
    phone: "+5511999999999",
    full_name: "Maria Silva",
    // ...
  },
  metadata: {
    ip_address: "192.168.1.1",
    user_agent: "Mozilla/5.0...",
  },
};

await db.insert(events).values(newEvent);
```

---

## Multi-tenant Schema

### Tabela: `organizations`

**Propósito:** Tenant raiz - representa grupo médico ou rede de clínicas.

```typescript
// src/db/schema/organizations.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  text,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, suspended, cancelled
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
```

---

### Tabela: `clinics`

**Propósito:** Unidade física de atendimento dentro de uma organização.

```typescript
export const clinics = pgTable(
  "clinics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    address: jsonb("address"),
    timezone: varchar("timezone", { length: 50 })
      .notNull()
      .default("America/Sao_Paulo"),
    settings: jsonb("settings").default({}),

    // WhatsApp Integration
    whatsappNumber: varchar("whatsapp_number", { length: 20 }).unique(),
    whatsappBusinessId: varchar("whatsapp_business_id", { length: 255 }),
    whatsappAccessToken: text("whatsapp_access_token"), // Encrypted

    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgSlugIdx: unique("uq_org_slug").on(table.organizationId, table.slug),
    whatsappIdx: index("idx_clinics_whatsapp").on(table.whatsappNumber),
  }),
);

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;
```

**Exemplo de address JSON:**

```json
{
  "street": "Rua das Flores",
  "number": "123",
  "complement": "Sala 45",
  "neighborhood": "Jardins",
  "city": "São Paulo",
  "state": "SP",
  "zip_code": "01234-567"
}
```

---

### Tabela: `users`

**Propósito:** Pessoa que acessa o sistema (médicos, recepcionistas, gestores).

```typescript
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authProviderId: varchar("auth_provider_id", { length: 255 })
      .notNull()
      .unique(), // Auth0/Clerk ID
    email: varchar("email", { length: 255 }).notNull().unique(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    status: varchar("status", { length: 50 }).notNull().default("active"), // active, inactive, suspended
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("idx_users_email").on(table.email),
    authProviderIdx: index("idx_users_auth_provider").on(table.authProviderId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

---

### Tabela: `roles`

**Propósito:** Define papéis e permissões no sistema.

```typescript
export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
```

**Roles predefinidos:**

```typescript
const defaultRoles = [
  {
    name: "admin",
    description: "Controle total da organização",
    permissions: ["*"], // Todas as permissões
  },
  {
    name: "manager",
    description: "Gestão de clínicas e relatórios",
    permissions: [
      "clinics.*",
      "reports.*",
      "patients.view",
      "appointments.*",
      "escalations.manage",
    ],
  },
  {
    name: "doctor",
    description: "Acesso a agenda e pacientes",
    permissions: [
      "appointments.view",
      "appointments.create",
      "appointments.update",
      "patients.view",
      "patients.update",
    ],
  },
  {
    name: "receptionist",
    description: "Agendamento e atendimento",
    permissions: [
      "appointments.*",
      "patients.view",
      "patients.create",
      "conversations.view",
      "conversations.reply",
    ],
  },
  {
    name: "viewer",
    description: "Apenas visualização",
    permissions: ["patients.view", "appointments.view", "conversations.view"],
  },
];
```

---

### Tabela: `organization_users`

**Propósito:** Relacionamento User ↔ Organization com role.

```typescript
export const organizationUsers = pgTable(
  "organization_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgUserUnique: unique("uq_org_user").on(table.organizationId, table.userId),
    orgIdx: index("idx_org_users_org").on(table.organizationId),
    userIdx: index("idx_org_users_user").on(table.userId),
  }),
);

export type OrganizationUser = typeof organizationUsers.$inferSelect;
export type NewOrganizationUser = typeof organizationUsers.$inferInsert;
```

---

### Tabela: `clinic_users`

**Propósito:** Relacionamento User ↔ Clinic com role específico.

```typescript
export const clinicUsers = pgTable(
  "clinic_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    customPermissions: jsonb("custom_permissions"), // Override de permissões
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clinicUserUnique: unique("uq_clinic_user").on(table.clinicId, table.userId),
    clinicIdx: index("idx_clinic_users_clinic").on(table.clinicId),
    userIdx: index("idx_clinic_users_user").on(table.userId),
  }),
);

export type ClinicUser = typeof clinicUsers.$inferSelect;
export type NewClinicUser = typeof clinicUsers.$inferInsert;
```

**Exemplo de customPermissions:**

```json
[
  "patients.delete", // Adiciona permissão
  "-appointments.delete" // Remove permissão (prefixo -)
]
```

---

### Tabela: `doctors`

**Propósito:** Profissional médico que atende pacientes.

```typescript
export const doctors = pgTable(
  "doctors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id), // Opcional - nem todo médico acessa o sistema
    professionalName: varchar("professional_name", { length: 255 }).notNull(),
    crm: varchar("crm", { length: 20 }).notNull(),
    crmState: varchar("crm_state", { length: 2 }).notNull(),
    specialties: jsonb("specialties").default([]),
    settings: jsonb("settings").default({}),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    crmUnique: unique("uq_crm").on(table.crm, table.crmState),
    userIdx: index("idx_doctors_user").on(table.userId),
  }),
);

export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;
```

**Exemplo de specialties:**

```json
["Cardiologia", "Clínica Médica"]
```

---

### Tabela: `clinic_doctors`

**Propósito:** Relacionamento Doctor ↔ Clinic (médico pode atender em várias clínicas).

```typescript
export const clinicDoctors = pgTable(
  "clinic_doctors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    consultationDurationMinutes: integer(
      "consultation_duration_minutes",
    ).default(30),
    price: integer("price"), // Em centavos
    acceptsNewPatients: varchar("accepts_new_patients", { length: 10 })
      .notNull()
      .default("true"),
    scheduleConfig: jsonb("schedule_config"), // Horários de atendimento
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clinicDoctorUnique: unique("uq_clinic_doctor").on(
      table.clinicId,
      table.doctorId,
    ),
    clinicIdx: index("idx_clinic_doctors_clinic").on(table.clinicId),
    doctorIdx: index("idx_clinic_doctors_doctor").on(table.doctorId),
  }),
);

export type ClinicDoctor = typeof clinicDoctors.$inferSelect;
export type NewClinicDoctor = typeof clinicDoctors.$inferInsert;
```

**Exemplo de scheduleConfig:**

```json
{
  "monday": [
    { "start": "09:00", "end": "12:00" },
    { "start": "14:00", "end": "18:00" }
  ],
  "tuesday": [{ "start": "09:00", "end": "12:00" }],
  "wednesday": [],
  "thursday": [{ "start": "14:00", "end": "18:00" }],
  "friday": [{ "start": "09:00", "end": "12:00" }],
  "saturday": [],
  "sunday": []
}
```

---

## Read Models (Projections)

### Tabela: `patients_view`

**Propósito:** View consolidada do estado atual do paciente.

```typescript
// src/db/schema/projections.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  real,
  jsonb,
  index,
  text,
  unique,
} from "drizzle-orm/pg-core";

export const patientsView = pgTable(
  "patients_view",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    birthDate: timestamp("birth_date"),
    cpf: varchar("cpf", { length: 11 }),
    status: varchar("status", { length: 50 }).notNull(),
    registrationSource: varchar("registration_source", { length: 50 }),

    // Preferências
    preferredCommunicationChannel: varchar("preferred_communication_channel", {
      length: 50,
    }),
    reminderEnabled: varchar("reminder_enabled", { length: 10 }).default(
      "true",
    ),
    reminderTimeBefore: integer("reminder_time_before").default(1440), // minutos

    // Metadados
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
  },
  (table) => ({
    orgPhoneIdx: unique("uq_patients_org_phone").on(
      table.organizationId,
      table.phone,
    ),
    statusIdx: index("idx_patients_status").on(table.status),
    createdIdx: index("idx_patients_created").on(table.createdAt),
    lastInteractionIdx: index("idx_patients_last_interaction").on(
      table.lastInteractionAt,
    ),
  }),
);

export type PatientView = typeof patientsView.$inferSelect;
```

---

### Tabela: `conversations_view`

**Propósito:** View de conversas ativas para dashboard de atendentes.

```typescript
export const conversationsView = pgTable(
  "conversations_view",
  {
    id: uuid("id").primaryKey(),
    patientId: uuid("patient_id").notNull(),
    clinicId: uuid("clinic_id").notNull(),
    status: varchar("status", { length: 50 }).notNull(),

    // Última mensagem
    lastMessageContent: text("last_message_content"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessageFrom: varchar("last_message_from", { length: 50 }),

    // Escalação
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    escalationReason: text("escalation_reason"),
    assignedAgentId: uuid("assigned_agent_id"),

    // Intenção
    detectedIntent: varchar("detected_intent", { length: 100 }),
    intentConfidence: real("intent_confidence"),

    // Contadores
    messageCount: integer("message_count").default(0),
    botMessageCount: integer("bot_message_count").default(0),

    // Metadados
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),

    // Desnormalizado
    patientName: varchar("patient_name", { length: 255 }),
    patientPhone: varchar("patient_phone", { length: 20 }),
  },
  (table) => ({
    clinicStatusIdx: index("idx_conv_clinic_status").on(
      table.clinicId,
      table.status,
    ),
    escalatedIdx: index("idx_conv_escalated").on(
      table.status,
      table.escalatedAt,
    ),
    lastMessageIdx: index("idx_conv_last_message").on(table.lastMessageAt),
  }),
);

export type ConversationView = typeof conversationsView.$inferSelect;
```

---

### Tabela: `appointments_view`

**Propósito:** View de agendamentos para calendário e listagens.

```typescript
export const appointmentsView = pgTable(
  "appointments_view",
  {
    id: uuid("id").primaryKey(),
    patientId: uuid("patient_id").notNull(),
    clinicId: uuid("clinic_id").notNull(),
    doctorId: uuid("doctor_id").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    duration: integer("duration").notNull(), // minutos

    status: varchar("status", { length: 50 }).notNull(),
    appointmentType: varchar("appointment_type", { length: 50 }),

    // Confirmação
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    confirmationMethod: varchar("confirmation_method", { length: 50 }),
    confirmationCount: integer("confirmation_count").default(0),

    // Reminders
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    reminderDeliveryStatus: varchar("reminder_delivery_status", { length: 50 }),

    notes: text("notes"),

    // Desnormalizado
    patientName: varchar("patient_name", { length: 255 }),
    patientPhone: varchar("patient_phone", { length: 20 }),
    doctorName: varchar("doctor_name", { length: 255 }),

    scheduledBy: varchar("scheduled_by", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    doctorDateIdx: index("idx_appt_doctor_date").on(
      table.doctorId,
      table.scheduledFor,
    ),
    patientDateIdx: index("idx_appt_patient_date").on(
      table.patientId,
      table.scheduledFor,
    ),
    clinicDateIdx: index("idx_appt_clinic_date").on(
      table.clinicId,
      table.scheduledFor,
    ),
    statusDateIdx: index("idx_appt_status_date").on(
      table.status,
      table.scheduledFor,
    ),
  }),
);

export type AppointmentView = typeof appointmentsView.$inferSelect;
```

---

### Tabela: `journey_view`

**Propósito:** View do estado atual da jornada do paciente.

```typescript
export const journeyView = pgTable(
  "journey_view",
  {
    id: uuid("id").primaryKey(),
    patientId: uuid("patient_id").notNull(),
    clinicId: uuid("clinic_id").notNull(),

    // Estado atual
    currentStage: varchar("current_stage", { length: 50 }).notNull(),
    stageEnteredAt: timestamp("stage_entered_at", {
      withTimezone: true,
    }).notNull(),

    // Risk scoring
    riskScore: real("risk_score").default(0.0),
    riskIndicators: jsonb("risk_indicators").default([]),
    lastRiskCalculationAt: timestamp("last_risk_calculation_at", {
      withTimezone: true,
    }),

    // Métricas
    totalAppointments: integer("total_appointments").default(0),
    attendedAppointments: integer("attended_appointments").default(0),
    noShowCount: integer("no_show_count").default(0),
    cancellationCount: integer("cancellation_count").default(0),

    // Interações
    totalMessages: integer("total_messages").default(0),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),

    // Escalação
    escalatedTo: uuid("escalated_to"),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    escalationReason: text("escalation_reason"),

    // Metadados
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Desnormalizado
    patientName: varchar("patient_name", { length: 255 }),
    patientPhone: varchar("patient_phone", { length: 20 }),
  },
  (table) => ({
    patientClinicIdx: unique("uq_journey_patient_clinic").on(
      table.patientId,
      table.clinicId,
    ),
    stageIdx: index("idx_journey_stage").on(table.currentStage),
    riskIdx: index("idx_journey_risk").on(table.riskScore),
    atRiskIdx: index("idx_journey_at_risk").on(
      table.currentStage,
      table.riskScore,
    ),
    lastInteractionIdx: index("idx_journey_last_interaction").on(
      table.lastInteractionAt,
    ),
  }),
);

export type JourneyView = typeof journeyView.$inferSelect;
```

---

## Exports Centralizados

```typescript
// src/db/schema/index.ts
export * from "./event-store";
export * from "./organizations";
export * from "./projections";
```

---

## Drizzle Service

```typescript
// src/db/drizzle.service.ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

@Injectable()
export class DrizzleService implements OnModuleInit {
  public db: ReturnType<typeof drizzle>;
  private pool: Pool;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.pool = new Pool({
      connectionString: this.configService.get<string>("DATABASE_URL"),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
```

---

## Drizzle Config

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default {
  schema: "./src/db/schema/*.ts",
  out: "./src/db/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

---

## Scripts úteis

```json
// package.json
{
  "scripts": {
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/db/seeds/index.ts"
  }
}
```

---

## Próximos Passos

1. ✅ Schema definido
2. ⏳ Criar migrations iniciais
3. ⏳ Implementar seeds para roles e dados de teste
4. ⏳ Implementar repositories
5. ⏳ Implementar event handlers para atualizar projections

---

## Documentação Relacionada

- [AUTHENTICATION.md](./AUTHENTICATION.md) - Autenticação e multi-tenancy
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Endpoints da API
- [EVENTS.md](../EVENTS.md) - Catálogo de eventos
- [AGGREGATES.md](../AGGREGATES.md) - Agregados do sistema

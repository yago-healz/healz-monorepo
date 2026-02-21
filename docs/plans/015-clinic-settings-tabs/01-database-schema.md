# Task 01 — Database Schema

**Objetivo:** Criar 5 tabelas especializadas para armazenar configurações de clínica, servindo como base de conhecimento para agentes.

---

## 📁 Arquivos Afetados

### Criar
- `apps/api/src/db/schema/clinic-settings.schema.ts` (novo arquivo com 5 tabelas)

### Modificar
- `apps/api/src/db/schema/index.ts` (adicionar export)

---

## Implementação

### 1. Criar `clinic-settings.schema.ts`

Adicionar este arquivo com as 5 tabelas:

```typescript
// apps/api/src/db/schema/clinic-settings.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core'
import { clinics } from './auth.schema'

// Table 1: Clinic Objectives
// Armazena prioridades e pontos de dor operacional
export const clinicObjectives = pgTable('clinic_objectives', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),

  // Priorities - stored as JSON array (order matters)
  // [{ id, title, description }, ...]
  priorities: jsonb('priorities').notNull().default([]),

  // Pain points - stored as JSON array
  // [{ id, title, description, selected }, ...]
  painPoints: jsonb('pain_points').notNull().default([]),

  // Additional notes
  additionalNotes: text('additional_notes'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})

// Table 2: Clinic Services
// Armazena serviços/procedimentos ofertados
export const clinicServices = pgTable('clinic_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),

  // Services - stored as JSON array
  // [{ id, title, description, duration, value, note }, ...]
  services: jsonb('services').notNull().default([]),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})

// Table 3: Clinic Scheduling Rules
// Armazena horários bloqueados e intervalos mínimos
export const clinicScheduling = pgTable('clinic_scheduling', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),

  // Time blocks - stored as JSON array
  // [{ id, from: "HH:MM", to: "HH:MM" }, ...]
  timeBlocks: jsonb('time_blocks').notNull().default([]),

  // Minimum interval between appointments in minutes
  minimumInterval: integer('minimum_interval').notNull().default(15),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})

// Table 4: Carol Settings
// Personalidade, greeting, regras de roteamento
export const clinicCarolSettings = pgTable('clinic_carol_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),

  // Selected personality traits - stored as JSON array
  // ["welcoming", "empathetic", ...]
  selectedTraits: jsonb('selected_traits').notNull().default([]),

  // Initial greeting message
  greeting: text('greeting').notNull().default(''),

  // Whether to restrict sensitive topics (medical diagnoses, billing)
  restrictSensitiveTopics: boolean('restrict_sensitive_topics')
    .notNull()
    .default(true),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})

// Table 5: Clinic Notifications
// Canais de alerta e triggers
export const clinicNotifications = pgTable('clinic_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),

  // Notification triggers - JSON object
  // { newBooking: boolean, riskOfLoss: boolean }
  notificationSettings: jsonb('notification_settings')
    .notNull()
    .default({ newBooking: true, riskOfLoss: true }),

  // Alert channel: 'whatsapp' or 'email'
  alertChannel: varchar('alert_channel', { length: 20 })
    .notNull()
    .default('whatsapp'),

  // Phone number for alerts (international format, e.g., "+5511999999999")
  phoneNumber: varchar('phone_number', { length: 20 }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})
```

### 2. Atualizar `apps/api/src/db/schema/index.ts`

Adicionar ao final:
```typescript
export * from "./clinic-settings.schema";
```

---

## 🎯 Estrutura de Dados (JSON)

### clinic_objectives
```json
{
  "priorities": [
    {
      "id": "revenue",
      "title": "Aumentar Receita",
      "description": "Foque em procedimentos de alto valor..."
    }
  ],
  "painPoints": [
    {
      "id": "no-shows",
      "title": "Pacientes que não comparecem",
      "description": "Agendamentos perdidos afetando receita",
      "selected": true
    }
  ],
  "additionalNotes": "..."
}
```

### clinic_services
```json
{
  "services": [
    {
      "id": "initial",
      "title": "Consulta Inicial",
      "description": "Primeiro contato com novos pacientes",
      "duration": "45",
      "value": "350.00",
      "note": "Pacientes devem chegar 15 min antes"
    }
  ]
}
```

### clinic_scheduling
```json
{
  "timeBlocks": [
    { "id": "1", "from": "12:00", "to": "14:00" }
  ],
  "minimumInterval": 15
}
```

### clinic_carol_settings
```json
{
  "selectedTraits": ["welcoming", "empathetic"],
  "greeting": "Olá! Sou a Carol...",
  "restrictSensitiveTopics": true
}
```

### clinic_notifications
```json
{
  "notificationSettings": { "newBooking": true, "riskOfLoss": true },
  "alertChannel": "whatsapp",
  "phoneNumber": "+5511999999999"
}
```

---

## ✅ Critério de Sucesso

- [ ] Todas as 5 tabelas criadas com tipos corretos (JSONB, varchar, etc.)
- [ ] Foreign keys configurados com `onDelete: 'cascade'` (ao deletar clínica, configs são deletadas)
- [ ] Índices padrão criados (timestamp, clinicId)
- [ ] Exports adicionados ao `index.ts`
- [ ] Schema válido no TypeScript (sem type errors)
- [ ] Estrutura JSON dentro de JSONB pronta para serem consultadas por agents (flattenable, com IDs claros)

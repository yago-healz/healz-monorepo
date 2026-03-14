# 01 — Schemas Drizzle

**Objetivo:** Criar os schemas Drizzle para as 6 novas tabelas do domain model.

---

## Arquivo a criar

`apps/api/src/infrastructure/database/schema/doctor-domain.schema.ts`

## Arquivo a modificar

`apps/api/src/infrastructure/database/schema/index.ts` — adicionar export do novo schema

## Implementação

Criar todas as tabelas num único arquivo de schema, seguindo os padrões existentes em `clinic-settings.schema.ts`:

```typescript
import {
  pgTable,
  pgEnum,
  uuid,
  timestamp,
  integer,
  text,
  jsonb,
  boolean,
  varchar,
  decimal,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { users, clinics } from './auth.schema'

// ──────────────────────────────────────────────
// 1. doctor_profiles — Perfil médico (1:1 com users)
// ──────────────────────────────────────────────
export const doctorProfiles = pgTable('doctor_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  crm: varchar('crm', { length: 50 }),          // ex: "CRM/SP 123456"
  specialty: varchar('specialty', { length: 100 }),
  bio: text('bio'),
  photoUrl: varchar('photo_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})

// ──────────────────────────────────────────────
// 2. doctor_clinics — Vínculo médico ↔ clínica (M:N)
// ──────────────────────────────────────────────
export const doctorClinics = pgTable('doctor_clinics', {
  id: uuid('id').primaryKey().defaultRandom(),
  doctorId: uuid('doctor_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),
  isActive: boolean('is_active').notNull().default(true),
  defaultDuration: integer('default_duration').notNull().default(30),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  uniqueIndex('uq_doctor_clinic').on(table.doctorId, table.clinicId),
  index('idx_doctor_clinics_clinic').on(table.clinicId),
  index('idx_doctor_clinics_doctor').on(table.doctorId),
])

// ──────────────────────────────────────────────
// 3. procedures — Catálogo de procedimentos da clínica
// ──────────────────────────────────────────────
export const procedures = pgTable('procedures', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),  // ex: "Consulta", "Estético", "Exame"
  defaultDuration: integer('default_duration').notNull().default(30),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  index('idx_procedures_clinic').on(table.clinicId),
])

// ──────────────────────────────────────────────
// 4. doctor_clinic_procedures — Procedimentos por médico/clínica
// ──────────────────────────────────────────────
export const doctorClinicProcedures = pgTable('doctor_clinic_procedures', {
  id: uuid('id').primaryKey().defaultRandom(),
  doctorClinicId: uuid('doctor_clinic_id')
    .references(() => doctorClinics.id, { onDelete: 'cascade' })
    .notNull(),
  procedureId: uuid('procedure_id')
    .references(() => procedures.id, { onDelete: 'cascade' })
    .notNull(),
  price: decimal('price', { precision: 10, scale: 2 }),
  durationOverride: integer('duration_override'),  // null = usa defaultDuration do procedure
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  uniqueIndex('uq_doctor_clinic_procedure').on(table.doctorClinicId, table.procedureId),
  index('idx_dcp_doctor_clinic').on(table.doctorClinicId),
  index('idx_dcp_procedure').on(table.procedureId),
])

// ──────────────────────────────────────────────
// 5. doctor_clinic_schedules — Agenda do médico por clínica (1:1 com doctor_clinics)
// ──────────────────────────────────────────────
// weeklySchedule: [{ day, isOpen, timeSlots: [{ id, from, to }] }]
// specificBlocks: [{ id, date, from, to, reason? }]
export const doctorClinicSchedules = pgTable('doctor_clinic_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  doctorClinicId: uuid('doctor_clinic_id')
    .references(() => doctorClinics.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  weeklySchedule: jsonb('weekly_schedule').notNull().default([]),
  specificBlocks: jsonb('specific_blocks').notNull().default([]),
  defaultAppointmentDuration: integer('default_appointment_duration').notNull().default(30),
  minimumAdvanceHours: integer('minimum_advance_hours').notNull().default(0),
  maxFutureDays: integer('max_future_days').notNull().default(365),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})

// ──────────────────────────────────────────────
// 6. payment_methods — Formas de pagamento da clínica
// ──────────────────────────────────────────────
export const paymentMethodTypeEnum = pgEnum('payment_method_type', [
  'pix',
  'credit_card',
  'debit_card',
  'cash',
  'insurance',
  'bank_transfer',
])

export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),
  type: paymentMethodTypeEnum('type').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  instructions: text('instructions'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  index('idx_payment_methods_clinic').on(table.clinicId),
])
```

## Done when

- [ ] Schema criado com as 6 tabelas
- [ ] Exportado no `schema/index.ts`
- [ ] Sem erros de TypeScript (`pnpm exec tsc --noEmit` no apps/api)

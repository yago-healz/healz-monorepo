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
// Armazena disponibilidade semanal, regras e bloqueios específicos
export const clinicScheduling = pgTable('clinic_scheduling', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),

  // Weekly schedule - available time slots per day of week
  // [{ day, isOpen, timeSlots: [{ id, from, to }] }, ...]
  weeklySchedule: jsonb('weekly_schedule').notNull().default([]),

  // Default appointment duration in minutes
  defaultAppointmentDuration: integer('default_appointment_duration').notNull().default(30),

  // Minimum hours in advance for scheduling
  minimumAdvanceHours: integer('minimum_advance_hours').notNull().default(0),

  // Maximum days in the future for appointments
  maxFutureDays: integer('max_future_days').notNull().default(365),

  // Specific date-based blocks
  // [{ id, date: "YYYY-MM-DD", from: "HH:MM", to: "HH:MM", reason? }, ...]
  specificBlocks: jsonb('specific_blocks').notNull().default([]),

  // Legacy: Time blocks - stored as JSON array (keeping for backward compatibility)
  // [{ id, from: "HH:MM", to: "HH:MM" }, ...]
  timeBlocks: jsonb('time_blocks').notNull().default([]),

  // Minimum interval between appointments in minutes (legacy)
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

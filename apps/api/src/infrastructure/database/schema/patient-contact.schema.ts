import {
  pgTable,
  uuid,
  varchar,
  date,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { clinics } from './auth.schema'

export const patientContacts = pgTable('patient_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),

  // Canal de identificação (pelo menos um deve existir)
  phone: varchar('phone', { length: 20 }),         // E.164: "+5511999887766"
  email: varchar('email', { length: 255 }),
  whatsappId: varchar('whatsapp_id', { length: 100 }),

  // Dados coletados progressivamente pela Carol
  name: varchar('name', { length: 255 }),
  cpf: varchar('cpf', { length: 14 }),
  dateOfBirth: date('date_of_birth'),

  // Vínculo com patient real (quando existir)
  patientId: uuid('patient_id'),

  // Metadata
  source: varchar('source', { length: 20 }).notNull().default('carol'),
  isVerified: boolean('is_verified').notNull().default(false),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  uniqueIndex('uq_patient_contact_phone').on(table.clinicId, table.phone),
  uniqueIndex('uq_patient_contact_cpf').on(table.clinicId, table.cpf),
  index('idx_patient_contacts_clinic').on(table.clinicId),
  index('idx_patient_contacts_phone').on(table.phone),
  index('idx_patient_contacts_patient').on(table.patientId),
])

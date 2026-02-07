import { pgTable, uuid, varchar, timestamp, jsonb, text } from 'drizzle-orm/pg-core';
import { clinicStatusEnum, roleNameEnum, userStatusEnum } from './enums';
import { organization } from './organization';
import { user } from './auth';

// ============ CLINIC TABLES ============

export const clinic = pgTable('clinic', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: jsonb('address'), // { street, city, state, zip, country }
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Sao_Paulo'),
  settings: jsonb('settings'),
  status: clinicStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const clinicUser = pgTable('clinic_user', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinic.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: roleNameEnum('role').notNull().default('receptionist'),
  customPermissions: jsonb('custom_permissions'), // Override de permissões
  status: userStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

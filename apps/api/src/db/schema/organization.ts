import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import { roleNameEnum } from './enums';
import { user } from './auth';

// ============ ORGANIZATION TABLES ============

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const member = pgTable('member', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: roleNameEnum('role').notNull().default('receptionist'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const invitation = pgTable('invitation', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: roleNameEnum('role').notNull().default('receptionist'),
  status: text('status').notNull().default('pending'), // pending, accepted, cancelled
  expiresAt: timestamp('expires_at').notNull(),
  inviterId: text('inviter_id').notNull().references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

// Schema base - expandir conforme documentação DATA_MODELING.md
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

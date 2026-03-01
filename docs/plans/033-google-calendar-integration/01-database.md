# Tarefa 01 — Banco de Dados: Novas Tabelas

**Objetivo:** Criar as tabelas para armazenar credenciais OAuth do Google Calendar por clínica e o mapeamento de appointments para eventos do Google Calendar.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/api/src/infrastructure/database/schema/clinic-settings.schema.ts` | Modificar — adicionar 2 novas tabelas |
| `apps/api/src/infrastructure/database/migrations/XXXX_google_calendar.sql` | Criar — gerado via `drizzle-kit generate` |

---

## Implementação

### 1. Adicionar tabelas ao schema

Em `apps/api/src/infrastructure/database/schema/clinic-settings.schema.ts`, adicionar ao final do arquivo:

```typescript
// Table 6: Clinic Google Calendar Credentials
// Armazena tokens OAuth por clínica (1:1 com clínica)
export const clinicGoogleCalendarCredentials = pgTable('clinic_google_calendar_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),

  // Tokens criptografados com AES-256 (chave via ENCRYPTION_KEY env var)
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }).notNull(),

  // Calendário selecionado (null até clínica completar a seleção)
  selectedCalendarId: varchar('selected_calendar_id', { length: 255 }),
  selectedCalendarName: varchar('selected_calendar_name', { length: 255 }),

  // Conta Google vinculada
  googleAccountEmail: varchar('google_account_email', { length: 255 }),

  // false quando clínica desconecta
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})

// Table 7: Clinic Appointment Google Calendar Events
// Mapeamento appointmentId <-> gcalEventId para sync e atualizações
export const clinicAppointmentGcalEvents = pgTable('clinic_appointment_gcal_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),
  appointmentId: uuid('appointment_id').notNull().unique(),
  gcalEventId: varchar('gcal_event_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
```

### 2. Exportar tabelas no index do schema

Verificar se `apps/api/src/infrastructure/database/schema/index.ts` (ou o arquivo de barrel do schema) exporta as novas tabelas. Adicionar as exports se necessário.

### 3. Gerar e aplicar migration

```bash
cd apps/api
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Verificar o arquivo SQL gerado em `src/infrastructure/database/migrations/` antes de aplicar.

---

## Critério de aceite

- As duas tabelas existem no banco após `drizzle-kit migrate`
- `clinic_google_calendar_credentials` tem constraint `UNIQUE` em `clinic_id`
- `clinic_appointment_gcal_events` tem constraint `UNIQUE` em `appointment_id`
- TypeScript compila sem erros (`pnpm exec tsc --noEmit`)

# Tarefa 01 — Banco de Dados: `clinic_whatsapp_credentials`

**Objetivo:** Criar a tabela que armazena o estado da conexão WhatsApp por clínica.

---

## Arquivo a modificar

`apps/api/src/infrastructure/database/schema/clinic-settings.schema.ts`

---

## Schema a adicionar

Adicionar ao final do arquivo `clinic-settings.schema.ts`:

```typescript
// Table 8: Clinic WhatsApp Credentials
// Armazena estado da conexão WhatsApp via Evolution API (1:1 com clínica)
export const clinicWhatsappCredentials = pgTable('clinic_whatsapp_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull()
    .unique(), // 1 conexão WhatsApp por clínica

  // Nome da instância na Evolution API: "clinic-{clinicId}"
  instanceName: varchar('instance_name', { length: 255 }).notNull(),

  // Token exclusivo desta instância na Evolution API
  instanceToken: text('instance_token').notNull(),

  // Estado da conexão: 'disconnected' | 'connecting' | 'connected'
  status: varchar('status', { length: 20 }).notNull().default('disconnected'),

  // Número de telefone vinculado (preenchido após conexão)
  phoneNumber: varchar('phone_number', { length: 30 }),

  // Último QR code base64 recebido via webhook (null quando conectado)
  lastQrCode: text('last_qr_code'),

  // Timestamp em que a conexão foi estabelecida
  connectedAt: timestamp('connected_at', { withTimezone: true }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})
```

---

## Exportar do index de schema

`apps/api/src/infrastructure/database/schema/index.ts` — adicionar `clinicWhatsappCredentials` aos exports.

---

## Migration

Após editar o schema, gerar e aplicar a migration:

```bash
cd apps/api
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

O arquivo gerado ficará em `src/infrastructure/database/migrations/0019_*.sql`.

---

## Critério de conclusão

- Tabela `clinic_whatsapp_credentials` existe no banco
- `clinicWhatsappCredentials` está exportado do schema
- Migration aplicada sem erros

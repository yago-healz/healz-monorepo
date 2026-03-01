# Fase 01 — Schema + Migration

## Objetivo

Estender a tabela `clinic_carol_settings` com os novos campos definidos no README e adicionar suporte ao sistema de versões Draft/Published.

## Pré-requisitos

Nenhum.

## Arquivos Afetados

### Modificar
- `apps/api/src/infrastructure/database/schema/clinic-settings.schema.ts`
- `apps/api/src/infrastructure/database/schema/index.ts` (se necessário re-exportar)

### Gerar
- `apps/api/src/infrastructure/database/migrations/XXXX_carol_versioning.sql` (via `drizzle-kit generate`)

---

## Alterações na Tabela `clinic_carol_settings`

### Novos Campos

```typescript
// Nome como Carol se apresenta ao paciente
name: varchar('name', { length: 100 }).notNull().default('Carol'),

// Tom de voz: como Carol se comunica
voiceTone: varchar('voice_tone', { length: 20 }).notNull().default('empathetic'),
// Valores aceitos: 'formal' | 'informal' | 'empathetic'

// Regras de agendamento customizáveis pelo admin
// { confirmBeforeScheduling: boolean, allowCancellation: boolean, ... }
schedulingRules: jsonb('scheduling_rules').notNull().default({}),

// Status da versão: draft ou published
status: varchar('status', { length: 20 }).notNull().default('draft'),
// Valores: 'draft' | 'published'

// Data de publicação (null = nunca publicado)
publishedAt: timestamp('published_at'),
```

### Campos Existentes (Manter)

Os campos `selectedTraits`, `greeting`, `restrictSensitiveTopics` continuam existindo e são usados pela Carol.

### Modelo de Dados de Versões

Cada clínica pode ter até **2 linhas** na tabela:
- Uma com `status = 'draft'` (sempre existe quando o admin salva)
- Uma com `status = 'published'` (criada/atualizada quando o admin publica)

**Fluxo:**
1. Admin salva configurações → upsert na row `draft`
2. Admin publica → copia dados do draft para a row `published` + marca `publishedAt`
3. Playground testa → carrega `draft` ou `published` conforme toggle

### Schema Resultante

```typescript
export const clinicCarolSettings = pgTable('clinic_carol_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),

  // Identificação
  name: varchar('name', { length: 100 }).notNull().default('Carol'),

  // Personalidade
  selectedTraits: jsonb('selected_traits').notNull().default([]),
  voiceTone: varchar('voice_tone', { length: 20 }).notNull().default('empathetic'),

  // Saudação
  greeting: text('greeting').notNull().default(''),

  // Regras
  restrictSensitiveTopics: boolean('restrict_sensitive_topics').notNull().default(true),
  schedulingRules: jsonb('scheduling_rules').notNull().default({}),

  // Versioning
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  publishedAt: timestamp('published_at'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})
```

---

## Estrutura do `schedulingRules` (JSONB)

```typescript
interface SchedulingRules {
  // Carol deve pedir confirmação antes de criar agendamento?
  confirmBeforeScheduling: boolean  // default: true

  // Carol pode cancelar consultas a pedido do paciente?
  allowCancellation: boolean  // default: true

  // Carol pode reagendar consultas?
  allowRescheduling: boolean  // default: true

  // Mensagem personalizada pós-agendamento
  postSchedulingMessage: string  // default: ''
}
```

---

## Migration

1. Rodar `pnpm drizzle-kit generate` para gerar migration
2. Rodar `pnpm drizzle-kit migrate` para aplicar
3. Verificar que dados existentes não foram perdidos (os campos novos têm defaults)

---

## Checklist

- [ ] Adicionar campos `name`, `voiceTone`, `schedulingRules`, `status`, `publishedAt` ao schema
- [ ] Gerar migration com `drizzle-kit generate`
- [ ] Aplicar migration com `drizzle-kit migrate`
- [ ] Verificar que registros existentes continuam funcionando (campos com defaults)

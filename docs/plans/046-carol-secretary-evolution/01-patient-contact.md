# Fase 1: Patient Contact — Identificação e Persistência de Pacientes

## Objetivo

Criar um mecanismo para que Carol identifique pacientes (novos e recorrentes) durante a conversa, colete informações progressivamente, e persista esses dados para uso em agendamentos e conversas futuras.

## Contexto

Atualmente, `CreateAppointmentTool` recebe apenas `patientName` como string e é mockado. Para criar agendamentos reais via `AppointmentService.schedule()`, precisamos de um `patientId` válido. Além disso, quando o paciente voltar a entrar em contato (especialmente via WhatsApp), precisamos reconhecê-lo.

## Schema: `patient_contacts`

Nova tabela para mapear canais de contato a pacientes:

```sql
CREATE TABLE patient_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Identificadores de canal (pelo menos um deve existir)
  phone VARCHAR(20),           -- E.164: "+5511999887766"
  email VARCHAR(255),
  whatsapp_id VARCHAR(100),    -- ID do WhatsApp Business API (futuro)

  -- Dados coletados progressivamente pela Carol
  name VARCHAR(255),
  cpf VARCHAR(14),             -- "123.456.789-00"
  date_of_birth DATE,

  -- Vínculo com patient real (quando existir)
  patient_id UUID,             -- FK para patients/patient_view (nullable)

  -- Metadata
  source VARCHAR(20) NOT NULL DEFAULT 'carol',  -- 'carol', 'whatsapp', 'web', 'manual'
  is_verified BOOLEAN NOT NULL DEFAULT false,    -- CPF/identidade confirmada

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,

  UNIQUE(clinic_id, phone),
  UNIQUE(clinic_id, cpf)
);

CREATE INDEX idx_patient_contacts_clinic ON patient_contacts(clinic_id);
CREATE INDEX idx_patient_contacts_phone ON patient_contacts(phone);
CREATE INDEX idx_patient_contacts_patient ON patient_contacts(patient_id);
```

### Decisões de Design:

1. **Por clínica**: Cada clínica tem seu registro do paciente (isolamento multi-tenant)
2. **Phone como identificador primário**: Para WhatsApp futuro, o telefone será o canal principal
3. **Coleta progressiva**: Campos nullable — Carol preenche conforme coleta durante conversa
4. **patient_id nullable**: Inicialmente null, vinculado quando paciente é formalmente cadastrado no sistema
5. **Sem duplicar tabela de pacientes**: Esta tabela é um "pré-cadastro" / mapeamento de contato, não substitui a entidade Patient do domínio

## Tool: `FindOrCreatePatientTool`

### Schema de Input:
```typescript
z.object({
  phone: z.string().optional().describe('Telefone do paciente (formato: +5511999887766)'),
  name: z.string().optional().describe('Nome do paciente'),
  cpf: z.string().optional().describe('CPF do paciente'),
  email: z.string().optional().describe('Email do paciente'),
})
```

### Comportamento:

```
1. Busca por phone OU cpf (identificadores únicos) na clinic
   → Se encontrou: retorna dados existentes + atualiza campos novos (ex: nome que não tinha)
   → Se não encontrou: cria novo registro com dados fornecidos

2. Retorna:
   {
     contactId: string,
     patientId: string | null,  // null se não vinculado a patient real
     name: string | null,
     phone: string | null,
     cpf: string | null,
     email: string | null,
     isNew: boolean,            // true se acabou de criar
     missingFields: string[],   // ex: ["cpf", "phone"] — campos que Carol pode tentar coletar
   }
```

### Lógica de Match:
```
Prioridade de busca:
  1. phone (se fornecido) → match exato na clínica
  2. cpf (se fornecido) → match exato na clínica
  3. Nenhum match → criar novo registro
```

### Integração com o Chat:

Carol usará esta tool em dois momentos:
- **Início da conversa**: Se vier de WhatsApp, o phone já estará disponível no contexto da sessão
- **Durante agendamento**: Antes de criar appointment, Carol pergunta nome/telefone e chama a tool

## Drizzle Schema

Arquivo: `apps/api/src/infrastructure/database/schema/patient-contact.schema.ts`

```typescript
import { pgTable, uuid, varchar, date, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { clinics } from './auth.schema'

export const patientContacts = pgTable('patient_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').references(() => clinics.id, { onDelete: 'cascade' }).notNull(),

  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  whatsappId: varchar('whatsapp_id', { length: 100 }),

  name: varchar('name', { length: 255 }),
  cpf: varchar('cpf', { length: 14 }),
  dateOfBirth: date('date_of_birth'),

  patientId: uuid('patient_id'),

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
```

## Tool Implementation

Arquivo: `apps/api/src/modules/carol/tools/find-or-create-patient.tool.ts`

```typescript
export class FindOrCreatePatientTool extends StructuredTool {
  name = 'find_or_create_patient'
  description = 'Busca um paciente pelo telefone ou CPF. Se não existir, cria um novo registro. Use antes de agendar para obter o ID do paciente.'

  schema = z.object({
    phone: z.string().optional().describe('Telefone do paciente com DDD'),
    name: z.string().optional().describe('Nome completo do paciente'),
    cpf: z.string().optional().describe('CPF do paciente'),
    email: z.string().optional().describe('Email do paciente'),
  })

  constructor(
    private readonly clinicId: string,
  ) { super() }

  async _call(input): Promise<string> {
    // 1. Normalizar phone para E.164
    // 2. Buscar por phone ou cpf
    // 3. Se encontrou → atualizar campos faltantes → retornar
    // 4. Se não → inserir novo → retornar com isNew: true
    // 5. Calcular missingFields para Carol saber o que perguntar
  }
}
```

## Session Context para WhatsApp (futuro)

Quando Carol receber mensagens via WhatsApp, o `phone` do paciente virá automaticamente no contexto da sessão:

```typescript
// No ChatRequestDto, adicionar campo opcional:
interface ChatRequestDto {
  message: string
  version: 'draft' | 'published'
  sessionId?: string
  channelContext?: {
    channel: 'whatsapp' | 'web' | 'playground'
    phone?: string        // Vem do WhatsApp automaticamente
    whatsappId?: string
  }
}
```

Carol receberá essa informação no system prompt e poderá chamar `find_or_create_patient` automaticamente no início da conversa para reconhecer o paciente.

## Migração

Gerar via `pnpm drizzle-kit generate` após adicionar o schema.

## Testes

1. **Busca por phone existente** → retorna dados, isNew: false
2. **Busca por CPF existente** → retorna dados, isNew: false
3. **Phone novo** → cria registro, isNew: true
4. **Atualização progressiva** → paciente sem nome, segunda chamada com nome → atualiza
5. **Isolamento por clínica** → mesmo phone em clínicas diferentes → registros separados
6. **Campos faltantes** → retorna missingFields correto

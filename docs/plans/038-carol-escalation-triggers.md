# Plano 038 — Regras de Encaminhamento (Carol Escalation Triggers)

**Objetivo:** Criar a aba "Regras de Encaminhamento" dentro da aba Carol, com CRUD completo de triggers de escalonamento que pausam a Carol e notificam a clínica via WhatsApp.

---

## Contexto

Quando a Carol detecta uma condição configurada (ex: palavra-chave proibida, pedido explícito de humano, muitas tentativas sem resolução), ela deve parar de responder e transferir o caso para um humano. Esta feature implementa **apenas o CRUD** — o acionamento automático é fora do escopo.

A aba será o 4º subtab da aba Carol, ao lado de Identidade, Comportamento e Contexto da Clínica.

**Padrões a seguir:**
- Backend: `carol-config.service.ts` + `carol-config.controller.ts` (upsert, guards, Drizzle)
- Frontend: `behavior-subtab.tsx` (React Hook Form + Zod), `carol.api.ts` (React Query), `carol-tab.tsx` (subtab wiring)

---

## Arquivos afetados

### Criar
| Arquivo | Descrição |
|---|---|
| `apps/api/src/modules/carol/dto/create-escalation-trigger.dto.ts` | DTO de criação |
| `apps/api/src/modules/carol/dto/update-escalation-trigger.dto.ts` | DTO de atualização (todos opcionais) |
| `apps/api/src/modules/carol/dto/escalation-trigger-response.dto.ts` | DTO de resposta |
| `apps/api/src/modules/carol/escalation-trigger.service.ts` | Service com CRUD |
| `apps/api/src/modules/carol/escalation-trigger.controller.ts` | Controller REST |
| `apps/web/src/features/carol/types/escalation-trigger.types.ts` | Tipos TypeScript frontend |
| `apps/web/src/features/carol/api/escalation-triggers.api.ts` | React Query hooks |
| `apps/web/src/features/carol/components/subtabs/escalation-triggers-subtab.tsx` | Componente da aba |

### Modificar
| Arquivo | O que muda |
|---|---|
| `apps/api/src/infrastructure/database/schema/clinic-settings.schema.ts` | Adicionar tabela `clinicEscalationTriggers` |
| `apps/api/src/infrastructure/database/schema/index.ts` | Re-exportar nova tabela (se existir barrel) |
| `apps/api/src/modules/carol/carol.module.ts` | Registrar novo service e controller |
| `apps/web/src/lib/api/endpoints.ts` | Adicionar `CAROL.ESCALATION_TRIGGERS` |
| `apps/web/src/routes/_authenticated/clinic/carol/settings.tsx` | Adicionar `'encaminhamento'` ao `CAROL_SUBTABS` |
| `apps/web/src/features/carol/components/carol-tab.tsx` | Adicionar entrada no `SUB_TABS` e renderizar novo subtab |

---

## Implementação

### 1. Schema do banco de dados

**Arquivo:** `apps/api/src/infrastructure/database/schema/clinic-settings.schema.ts`

Adicionar nova tabela ao final do arquivo:

```typescript
export const clinicEscalationTriggers = pgTable('clinic_escalation_triggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => clinics.id, { onDelete: 'cascade' })
    .notNull(),

  // Nome da regra, ex: "Palavra proibida", "Pedido de humano"
  name: varchar('name', { length: 150 }).notNull(),

  // Descrição opcional para contexto
  description: text('description'),

  // Tipo de condição que dispara o encaminhamento
  // 'out_of_scope' | 'keyword_detected' | 'max_attempts_exceeded' | 'explicit_request' | 'custom'
  conditionType: varchar('condition_type', { length: 50 }).notNull(),

  // Parâmetros da condição (dependem do tipo):
  // keyword_detected:      { keywords: string[] }
  // max_attempts_exceeded: { maxAttempts: number }
  // custom:                { prompt: string }
  // out_of_scope, explicit_request: null
  conditionParams: jsonb('condition_params'),

  // Trigger ativo/inativo
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})
```

Após editar o schema, gerar e aplicar a migration:
```bash
cd apps/api
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 2. DTOs do backend

**`create-escalation-trigger.dto.ts`**
```typescript
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator'

export const CONDITION_TYPES = [
  'out_of_scope',
  'keyword_detected',
  'max_attempts_exceeded',
  'explicit_request',
  'custom',
] as const

export type ConditionType = typeof CONDITION_TYPES[number]

export class CreateEscalationTriggerDto {
  @IsString()
  @MaxLength(150)
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsIn(CONDITION_TYPES)
  conditionType: ConditionType

  @IsObject()
  @IsOptional()
  conditionParams?: Record<string, unknown>

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
```

**`update-escalation-trigger.dto.ts`**
```typescript
import { PartialType } from '@nestjs/mapped-types'
import { CreateEscalationTriggerDto } from './create-escalation-trigger.dto'

export class UpdateEscalationTriggerDto extends PartialType(CreateEscalationTriggerDto) {}
```

**`escalation-trigger-response.dto.ts`**
```typescript
export class EscalationTriggerResponseDto {
  id: string
  clinicId: string
  name: string
  description: string | null
  conditionType: string
  conditionParams: Record<string, unknown> | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date | null
}
```

### 3. Service do backend

**`escalation-trigger.service.ts`** — 4 métodos:

```typescript
@Injectable()
export class EscalationTriggerService {
  async list(clinicId: string): Promise<EscalationTriggerResponseDto[]>
  // SELECT * FROM clinic_escalation_triggers WHERE clinic_id = clinicId ORDER BY created_at ASC

  async create(clinicId: string, dto: CreateEscalationTriggerDto): Promise<EscalationTriggerResponseDto>
  // INSERT INTO clinic_escalation_triggers VALUES (...)

  async update(clinicId: string, triggerId: string, dto: UpdateEscalationTriggerDto): Promise<EscalationTriggerResponseDto>
  // UPDATE ... WHERE id = triggerId AND clinic_id = clinicId
  // Lançar NotFoundException se não encontrar

  async remove(clinicId: string, triggerId: string): Promise<void>
  // DELETE WHERE id = triggerId AND clinic_id = clinicId
  // Lançar NotFoundException se não encontrar
}
```

### 4. Controller do backend

**`escalation-trigger.controller.ts`**

```typescript
@ApiTags('Carol')
@Controller('clinics')
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth('bearer')
export class EscalationTriggerController {
  // GET    /clinics/:clinicId/carol/escalation-triggers
  // POST   /clinics/:clinicId/carol/escalation-triggers
  // PATCH  /clinics/:clinicId/carol/escalation-triggers/:triggerId
  // DELETE /clinics/:clinicId/carol/escalation-triggers/:triggerId
}
```

### 5. Registrar no CarolModule

**`carol.module.ts`** — adicionar `EscalationTriggerService` e `EscalationTriggerController` ao providers e controllers.

### 6. Tipos frontend

**`apps/web/src/features/carol/types/escalation-trigger.types.ts`**

```typescript
export type ConditionType =
  | 'out_of_scope'
  | 'keyword_detected'
  | 'max_attempts_exceeded'
  | 'explicit_request'
  | 'custom'

export interface EscalationTrigger {
  id: string
  clinicId: string
  name: string
  description: string | null
  conditionType: ConditionType
  conditionParams: Record<string, unknown> | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CreateEscalationTriggerRequest {
  name: string
  description?: string
  conditionType: ConditionType
  conditionParams?: Record<string, unknown>
  isActive?: boolean
}

export type UpdateEscalationTriggerRequest = Partial<CreateEscalationTriggerRequest>
```

### 7. Endpoints frontend

**`apps/web/src/lib/api/endpoints.ts`** — adicionar dentro de `CAROL`:

```typescript
ESCALATION_TRIGGERS: (clinicId: string) =>
  `/clinics/${clinicId}/carol/escalation-triggers`,
ESCALATION_TRIGGER: (clinicId: string, triggerId: string) =>
  `/clinics/${clinicId}/carol/escalation-triggers/${triggerId}`,
```

### 8. API hooks frontend

**`apps/web/src/features/carol/api/escalation-triggers.api.ts`**

```typescript
export const useEscalationTriggers = () => { /* useQuery */ }
export const useCreateEscalationTrigger = () => { /* useMutation POST */ }
export const useUpdateEscalationTrigger = () => { /* useMutation PATCH */ }
export const useDeleteEscalationTrigger = () => { /* useMutation DELETE */ }
```

Query key: `['carol', clinicId, 'escalation-triggers']`

Toasts:
- Create success: `"Regra de encaminhamento criada"`
- Update success: `"Regra atualizada"`
- Delete success: `"Regra removida"`
- Error genérico: `"Erro ao salvar regra de encaminhamento"`

### 9. Componente da subtab

**`escalation-triggers-subtab.tsx`** — estrutura geral:

```
EscalationTriggersSubtab
├── Header: título + botão "Adicionar Regra"
├── Lista de triggers (se vazio: empty state)
│   └── TriggerCard (por trigger)
│       ├── Nome + badge do tipo de condição
│       ├── Descrição (se houver)
│       ├── Switch isActive (toggle inline)
│       └── Botões: Editar | Excluir
└── TriggerFormDialog (Add/Edit, compartilhado)
    ├── Campo: Nome (text input, required)
    ├── Campo: Descrição (textarea, optional)
    ├── Campo: Tipo de condição (Select)
    │   ├── Pergunta fora do escopo
    │   ├── Palavra-chave detectada → mostra campo de keywords
    │   ├── Tentativas excedidas → mostra campo de número
    │   ├── Pedido explícito de humano
    │   └── Personalizado → mostra campo de prompt
    ├── Campos condicionais (baseado no tipo selecionado):
    │   - keyword_detected: TagInput para lista de keywords
    │   - max_attempts_exceeded: NumberInput (ex: 3)
    │   - custom: Textarea para descrever a condição em linguagem natural
    └── Botões: Cancelar | Salvar
```

**Labels de `conditionType` para exibição:**
```typescript
const CONDITION_TYPE_LABELS: Record<ConditionType, string> = {
  out_of_scope: 'Pergunta fora do escopo',
  keyword_detected: 'Palavra-chave detectada',
  max_attempts_exceeded: 'Tentativas excedidas',
  explicit_request: 'Pedido explícito de humano',
  custom: 'Condição personalizada',
}
```

**Toggle de isActive:** usar o componente `Switch` do Shadcn/UI. Ao clicar, chamar `useUpdateEscalationTrigger` com `{ isActive: !trigger.isActive }` diretamente (sem abrir dialog).

**Delete:** Mostrar `AlertDialog` de confirmação antes de deletar.

**Form validation (Zod):**
```typescript
const schema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  conditionType: z.enum(['out_of_scope', 'keyword_detected', 'max_attempts_exceeded', 'explicit_request', 'custom']),
  conditionParams: z.object({
    keywords: z.array(z.string()).optional(),
    maxAttempts: z.number().int().min(1).optional(),
    prompt: z.string().optional(),
  }).optional(),
})
```

### 10. Wiring na rota e no CarolTab

**`settings.tsx`** — adicionar `'encaminhamento'` ao array `CAROL_SUBTABS`:
```typescript
const CAROL_SUBTABS = ['identidade', 'comportamento', 'contexto', 'encaminhamento'] as const
```

**`carol-tab.tsx`** — adicionar entrada ao array `SUB_TABS` e renderizar o componente:
```typescript
{ id: 'encaminhamento', label: 'Regras de Encaminhamento' }
// ...
{activeSubTab === 'encaminhamento' && <EscalationTriggersSubtab />}
```

---

## Ordem de execução

```
1. [Schema] Adicionar tabela clinicEscalationTriggers + gerar migration
      ↓
2. [Backend DTOs] create, update, response DTOs         ← paralelo com 3
   [Frontend Types + Endpoints] types.ts + endpoints.ts ← paralelo com 2
      ↓
3. [Backend Service] escalation-trigger.service.ts
      ↓
4. [Backend Controller + Module] controller + registrar no carol.module.ts
      ↓
5. [Frontend API hooks] escalation-triggers.api.ts (depende dos types/endpoints)
      ↓
6. [Frontend Componente] escalation-triggers-subtab.tsx
      ↓
7. [Wiring] settings.tsx + carol-tab.tsx
```

Passos 2 e 3 (frontend types/endpoints vs backend DTOs) são completamente independentes e podem ser feitos em paralelo.

---

## Fora do escopo

- Lógica de detecção automática dos triggers durante o fluxo da Carol
- Notificação via WhatsApp ao detectar um trigger
- Histórico de acionamentos (log de quando cada trigger foi disparado)
- Prioridade/ordenação entre triggers
- Vinculação de trigger a médico específico ou serviço
- Testes automatizados

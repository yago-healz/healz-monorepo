# Task 03 — Mover Módulos de Infraestrutura

**Objetivo:** Mover módulos cross-cutting de infraestrutura para `src/infrastructure/`.

---

## Módulos a mover

### 1. Database (`db/` → `infrastructure/database/`)

| De | Para |
|---|---|
| `src/db/index.ts` | `src/infrastructure/database/index.ts` |
| `src/db/schema/` (inteiro) | `src/infrastructure/database/schema/` |
| `src/db/migrations/` (inteiro) | `src/infrastructure/database/migrations/` |
| `src/db/seeds/` (inteiro) | `src/infrastructure/database/seeds/` |
| `src/db/middleware/rls.middleware.ts` | `src/infrastructure/database/middleware/rls.middleware.ts` |

**Imports afetados:**
- `src/db/index.ts` (ou `src/db`) é importado em praticamente todos os services
- `src/db/middleware` é importado em `app.module.ts`
- `src/db/schema/*` é importado em services que fazem queries

**Atenção especial:**
- `drizzle.config.ts` na raiz do apps/api referencia `src/db/schema` → atualizar na Task 06
- `src/db/index.ts` exporta `db` como barrel → manter o mesmo pattern

### 2. Event Sourcing (`event-sourcing/` → `infrastructure/event-sourcing/`)

| De | Para |
|---|---|
| `src/event-sourcing/` (inteiro) | `src/infrastructure/event-sourcing/` |

**Imports afetados:**
- `event-sourcing.module.ts` → importado em `app.module.ts`
- `domain/aggregate-root.ts` → importado em todos os aggregates (patient, conversation, appointment, patient-journey)
- `domain/domain-event.interface.ts` → importado em todos os event files
- `domain/event-handler.interface.ts` → importado nos projection handlers
- `event-store/event-store.interface.ts` → importado nos services
- `event-bus/rabbitmq-event-bus.service.ts` → importado via token `"IEventBus"`
- `utils/correlation.util.ts` → importado nos command handlers

### 3. Audit (`audit/` → `infrastructure/audit/`)

| De | Para |
|---|---|
| `src/audit/audit.module.ts` | `src/infrastructure/audit/audit.module.ts` |
| `src/audit/audit.service.ts` | `src/infrastructure/audit/audit.service.ts` |

**Nota:** `audit.interceptor.ts` já foi movido para `common/interceptors/` na Task 02.

**Imports afetados:**
- `audit.module.ts` → importado em `app.module.ts` e `platform-admin.module.ts`
- `audit.service.ts` → importado no `audit.interceptor.ts` (agora em common/)

### 4. Mail (`mail/` → `infrastructure/mail/`)

| De | Para |
|---|---|
| `src/mail/mail.module.ts` | `src/infrastructure/mail/mail.module.ts` |
| `src/mail/mail.service.ts` | `src/infrastructure/mail/mail.service.ts` |

**Imports afetados:**
- `mail.module.ts` → importado em `app.module.ts` (via MailModule, mas é @Global)
- `mail.service.ts` → injetado via DI, pode ser importado em signup, invites, auth, platform-admin

---

## Estratégia de atualização de imports

Para cada módulo movido:

1. Mover todos os arquivos com `git mv` (preserva histórico)
2. Fazer busca global: `grep -r "from.*'/modulo-antigo" apps/api/src/`
3. Atualizar cada import para o novo path
4. Verificar: `pnpm exec tsc --noEmit`

---

## Done when

- Pastas `src/db/`, `src/event-sourcing/`, `src/audit/`, `src/mail/` não existem mais
- Todo o conteúdo está em `src/infrastructure/`
- Todos os imports atualizados
- `pnpm exec tsc --noEmit` compila sem erros

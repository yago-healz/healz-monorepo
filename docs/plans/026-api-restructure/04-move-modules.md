# Task 04 — Mover Feature Modules para `modules/`

**Objetivo:** Mover todos os módulos de domínio/feature para `src/modules/`.

---

## Módulos a mover

Cada módulo é movido **inteiro** (pasta completa) para `src/modules/`:

| De | Para |
|---|---|
| `src/auth/` | `src/modules/auth/` |
| `src/signup/` | `src/modules/signup/` |
| `src/invites/` | `src/modules/invites/` |
| `src/organizations/` | `src/modules/organizations/` |
| `src/clinics/` | `src/modules/clinics/` |
| `src/clinic-settings/` | `src/modules/clinic-settings/` |
| `src/patient/` | `src/modules/patient/` |
| `src/conversation/` | `src/modules/conversation/` |
| `src/appointment/` | `src/modules/appointment/` |
| `src/patient-journey/` | `src/modules/patient-journey/` |
| `src/messaging/` | `src/modules/messaging/` |
| `src/carol/` | `src/modules/carol/` |
| `src/platform-admin/` | `src/modules/platform-admin/` |

**Total:** 13 módulos

---

## Observações por módulo

### auth/
- Na Task 02, `decorators/`, `guards/` e `interfaces/` já foram movidos para `common/`
- Sobram: `auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `dto/`, `strategies/`
- Após mover, atualizar imports internos que referenciavam `../auth/decorators/` etc. para `../../common/decorators/`

### platform-admin/
- Na Task 02, `dto/common/` foi movido para `common/dto/`
- Após mover, atualizar imports dos DTOs de paginação

### conversation/
- Importa `CarolModule` → path muda de `../carol/` para `../carol/`  (mesma profundidade, ambos em `modules/`)

### Demais módulos
- Movem inteiros sem modificação interna
- Imports entre módulos no mesmo nível (`modules/X` → `modules/Y`) mantêm path relativo similar

---

## Estratégia

Para cada módulo:

```bash
# 1. Mover com git mv
git mv src/auth src/modules/auth

# 2. Buscar imports quebrados
grep -r "from.*['\"].*\/auth\/" apps/api/src/ --include="*.ts"

# 3. Atualizar cada import
# De: from '../auth/auth.module'
# Para: from '../modules/auth/auth.module'  (se estiver em src/)
# Ou:  from './auth/auth.module'  (se estiver em src/modules/)

# 4. Verificar compilação
cd apps/api && pnpm exec tsc --noEmit
```

**Dica:** fazer todos os `git mv` primeiro, depois atualizar todos os imports de uma vez. É mais eficiente que fazer um módulo por vez.

---

## Imports a atualizar no app.module.ts

Todos os imports do `app.module.ts` mudam:

```typescript
// ANTES
import { AuthModule } from "./auth/auth.module";
import { PatientModule } from "./patient/patient.module";
// ...

// DEPOIS
import { AuthModule } from "./modules/auth/auth.module";
import { PatientModule } from "./modules/patient/patient.module";
// ...
```

---

## Done when

- Nenhum feature module existe diretamente em `src/` (todos em `src/modules/`)
- Todos os imports atualizados
- `pnpm exec tsc --noEmit` compila sem erros

# Task 02 — Mover Itens Compartilhados para `common/`

**Objetivo:** Extrair guards, decorators, interceptors e interfaces que são usados globalmente (cross-module) para `common/`.

---

## Arquivos a mover

### Decorators
| De | Para |
|---|---|
| `src/auth/decorators/current-user.decorator.ts` | `src/common/decorators/current-user.decorator.ts` |
| `src/auth/decorators/roles.decorator.ts` | `src/common/decorators/roles.decorator.ts` |

### Guards (globais)
| De | Para |
|---|---|
| `src/auth/guards/jwt-auth.guard.ts` | `src/common/guards/jwt-auth.guard.ts` |
| `src/auth/guards/roles.guard.ts` | `src/common/guards/roles.guard.ts` |
| `src/auth/guards/email-verified.guard.ts` | `src/common/guards/email-verified.guard.ts` |

### Interceptors
| De | Para |
|---|---|
| `src/audit/audit.interceptor.ts` | `src/common/interceptors/audit.interceptor.ts` |

### Interfaces
| De | Para |
|---|---|
| `src/auth/interfaces/jwt-payload.interface.ts` | `src/common/interfaces/jwt-payload.interface.ts` |

### Swagger
| De | Para |
|---|---|
| `src/common/swagger-schemas.ts` | `src/common/swagger/swagger-schemas.ts` |

### DTOs compartilhados
| De | Para |
|---|---|
| `src/platform-admin/dto/common/pagination-query.dto.ts` | `src/common/dto/pagination-query.dto.ts` |
| `src/platform-admin/dto/common/pagination-meta.dto.ts` | `src/common/dto/pagination-meta.dto.ts` |

---

## Imports a atualizar

Após mover cada arquivo, atualizar **todos os arquivos que importam dele**. Usar o IDE ou `grep -r` para encontrar cada import.

### Decorators — arquivos que importam
- `current-user.decorator.ts` → usado em controllers: auth, patient, conversation, appointment, clinics, organizations, clinic-settings, platform-admin, patient-journey
- `roles.decorator.ts` → usado junto com `roles.guard.ts`

### Guards — arquivos que importam
- `jwt-auth.guard.ts` → usado em praticamente todos os controllers
- `roles.guard.ts` → usado em controllers com `@Roles()`
- `email-verified.guard.ts` → usado em controllers que exigem email verificado

### Interceptor
- `audit.interceptor.ts` → importado em `app.module.ts` e `audit.module.ts`

### Interface
- `jwt-payload.interface.ts` → usado em `jwt.strategy.ts`, `current-user.decorator.ts`, guards

### Swagger
- `swagger-schemas.ts` → verificar quem importa (provavelmente controllers)

### DTOs de paginação
- `pagination-query.dto.ts` e `pagination-meta.dto.ts` → usados nos controllers e services do platform-admin

**Dica:** após mover, deletar as pastas `src/auth/decorators/`, `src/auth/guards/`, `src/auth/interfaces/` se ficarem vazias.

---

## Guards que NÃO movem (são específicos do módulo)

- `src/invites/guards/is-org-admin.guard.ts` → específico do InvitesModule
- `src/clinics/guards/is-clinic-admin.guard.ts` → específico do ClinicsModule
- `src/platform-admin/guards/platform-admin.guard.ts` → específico do PlatformAdminModule

Estes ficam dentro dos seus respectivos módulos.

---

## Done when

- Todos os arquivos listados estão em `common/`
- Pastas vazias de origem foram removidas
- Todos os imports atualizados
- `pnpm exec tsc --noEmit` compila sem erros no apps/api

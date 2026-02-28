# Plano 033 — Gerenciamento de Membros da Clínica

**Objetivo:** Implementar a página `/clinic/members` com dados reais — listar (membros ativos + convites pendentes), convidar, remover e reenviar convite de membros de uma clínica.

---

## Contexto

A página de membros existe mas usa dados mocados. O backend tem apenas `POST /clinics/{clinicId}/members` (adicionar usuário existente). Faltam 4 endpoints e toda a camada de API do frontend.

### Arquitetura existente relevante

| Camada | Padrão |
|---|---|
| Backend | NestJS + Drizzle ORM; endpoints em `clinics.controller.ts` + `clinics.service.ts` |
| DTOs | Arquivos separados em `dto/`; decorators `@ApiProperty` + `class-validator` |
| Guard | `IsClinicAdminGuard` — já existe, verifica org admin ou clinic manager |
| Frontend | Hooks em `features/clinic/api/clinic-settings.api.ts`; endpoints em `lib/api/clinic-settings-endpoints.ts` |
| Query keys | Padrão `["clinic-members", clinicId, params]` |

### Schema de banco (tabelas relevantes)

```
userClinicRoles → id, userId, clinicId, role, createdAt
invites         → id, email, name, token, clinicId, organizationId, role, invitedBy, expiresAt, usedAt, createdAt
users           → id, email, name, status, emailVerified
```

---

## Tarefas

| # | Arquivo | Descrição | Depende de |
|---|---------|-----------|------------|
| [01](./01-backend-get-members.md) | `clinics.controller.ts` + `clinics.service.ts` + 2 DTOs | `GET /clinics/{id}/members` com busca, paginação e convites pendentes | — |
| [02](./02-backend-mutations.md) | `clinics.controller.ts` + `clinics.service.ts` + 3 DTOs | `DELETE`, `PATCH` e `POST resend-invite` | — |
| [03](./03-frontend-api-layer.md) | `clinic-members-endpoints.ts` + `clinic-members.api.ts` | Endpoints, tipos e 5 hooks React Query | — |
| [04](./04-frontend-components.md) | `members-table.tsx` + 2 novos dialogs + `members.tsx` | Substituir mock, paginação real, dialogs | 01, 02, 03 |

---

## Ordem de execução

```
1. [01] + [02] + [03]  ← paralelos (sem dependência mútua)
2. [04]                ← requer 01, 02 e 03
```

---

## Fora do escopo

- Fluxo de "Adicionar usuário existente" por `userId` (UI só fará por email via lookup futuro)
- Paginação por cursor (usar offset/page)
- Gerenciamento de permissões granulares além de role
- Testes automatizados (e2e ou unitários)

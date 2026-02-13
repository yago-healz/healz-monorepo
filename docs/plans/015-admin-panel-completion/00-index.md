# Plano 015 - Admin Panel Completion

**Status:** Proposto
**Data:** 2026-02-13
**Objetivo:** Completar o painel de administração com CRUD funcional, páginas de detalhe ricas e gestão de Platform Admins.

## Contexto

Toda a estrutura base já existe (rotas, componentes de form, API hooks, tipos). O trabalho é:
1. Consertar o que está incompleto (form de criar org, actions nas tabelas)
2. Enriquecer as páginas de detalhe com sub-entidades e ações
3. Criar a nova seção de Platform Admins

## Planos

| # | Arquivo | Escopo | Complexidade |
|---|---------|--------|--------------|
| 01 | [table-actions-and-navigation.md](./01-table-actions-and-navigation.md) | Wire Edit nas tabelas + status toggle + botões "Novo" | Baixa |
| 02 | [organization-create-form.md](./02-organization-create-form.md) | Completar form de criação de org (initialClinic + initialAdmin) | Média |
| 03 | [organization-detail-enrichment.md](./03-organization-detail-enrichment.md) | Página de detalhe da org: clinics sub-table + status toggle | Média |
| 04 | [clinic-detail-enrichment.md](./04-clinic-detail-enrichment.md) | Página de detalhe da clínica: users sub-table + status toggle | Média |
| 05 | [user-detail-admin-actions.md](./05-user-detail-admin-actions.md) | Painel de ações admin na página de usuário | Baixa |
| 06 | [platform-admins-section.md](./06-platform-admins-section.md) | Seção completa de Platform Admins (nova) | Alta |

## Ordem de Execução Recomendada

1. **Plano 01** → Correções rápidas nas tabelas (independente)
2. **Plano 02** → Form de criação de org (independente)
3. **Plano 03** → Detalhe de org (depende de tipos existentes)
4. **Plano 04** → Detalhe de clínica (independente)
5. **Plano 05** → Actions de usuário (independente, mais simples)
6. **Plano 06** → Platform Admins (novo módulo completo)

## Arquivos-Chave de Referência

```
apps/web/src/
├── types/api.types.ts                          # Tipos já definidos (PlatformAdmin, etc.)
├── features/platform-admin/
│   ├── api/
│   │   ├── organizations-api.ts                # useOrganizations, useUpdateOrganizationStatus
│   │   ├── clinics-api.ts                      # useClinics, useUpdateClinicStatus
│   │   └── users-api.ts                        # useUsers, useImpersonateUser, etc.
│   └── components/
│       ├── organizations/
│       │   ├── organizations-table.tsx          # Tabela de orgs (editar aqui)
│       │   └── organization-form.tsx            # Form atual (adicionar campos)
│       ├── clinics/
│       │   ├── clinics-table.tsx               # Tabela de clínicas
│       │   └── clinic-form.tsx
│       └── users/
│           ├── users-table.tsx                 # Tabela de usuários
│           ├── user-form.tsx
│           └── user-clinics-manager.tsx        # Já existe e funcional
├── routes/_authenticated/admin/
│   ├── organizations/
│   │   ├── index.tsx                           # Lista
│   │   ├── new.tsx                             # Criação (já existe)
│   │   └── $id.tsx                             # Detalhe (já existe, enriquecer)
│   ├── clinics/
│   │   ├── index.tsx
│   │   ├── new.tsx
│   │   └── $id.tsx
│   └── users/
│       ├── index.tsx
│       ├── new.tsx
│       └── $id.tsx
```

## Convenções do Projeto

- **Componentes:** PascalCase, arquivos kebab-case
- **Hooks:** use-kebab-case
- **Toasts:** via `sonner` (import `toast` from `'sonner'`)
- **Confirmações destrutivas:** `AlertDialog` do Shadcn
- **Loading states:** `Skeleton` + `isPending` do TanStack Query
- **Navegação:** `useNavigate` do TanStack Router
- **Ícones:** Lucide React

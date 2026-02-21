# Plano 015 — Implementar Abas de Configurações da Clínica

**Objetivo:** Implementar as funcionalidades das 5 abas de configurações (Objetivos, Serviços, Agendamentos, Carol, Notificações) com persistência em banco de dados especializado para servir como base de conhecimento de agentes WhatsApp.

---

## 📋 Contexto

### Por que?
As configurações de clínica (objetivos operacionais, serviços, regras de agendamento, personalidade do Carol, canais de notificação) serão usadas como base de conhecimento para um agente de WhatsApp futuro. Precisa estar estruturada e facilmente acessível.

### Restrições
- Usar tabelas especializadas (não JSON columns) pois serão consultadas frequentemente por agents
- Manter padrão existente: Drizzle ORM, NestJS DTOs, React Query
- Componentes das abas já existem no frontend com UI/UX
- Apenas "Salvar + Restaurar" (sem CRUD avançado: editar lista, deletar items individuais, etc.)

### Stack atual
- **Backend:** NestJS + Drizzle ORM + PostgreSQL
- **Frontend:** React 18 + Tanstack Query v5 + React Hook Form + Zod
- **Tipos:** Centralizados em `src/types/`

---

## 📊 Tabela de Tasks

| Task | Arquivo | Dependências |
|------|---------|--------------|
| [01-database-schema.md](./01-database-schema.md) | `apps/api/src/db/schema/clinic-settings.schema.ts` | Nenhuma (blocker) |
| [02-api-dtos-endpoints.md](./02-api-dtos-endpoints.md) | `apps/api/src/clinic-settings/*` | 01 |
| [03-frontend-types-hooks.md](./03-frontend-types-hooks.md) | `apps/web/src/types/`, `apps/web/src/features/clinic/api/` | 01 |
| [04-connect-objectives-tab.md](./04-connect-objectives-tab.md) | `apps/web/src/features/clinic/components/settings/tabs/objectives-tab.tsx` | 02, 03 |
| [05-connect-services-tab.md](./05-connect-services-tab.md) | `apps/web/src/features/clinic/components/settings/tabs/services-tab.tsx` | 02, 03 |
| [06-connect-scheduling-tab.md](./06-connect-scheduling-tab.md) | `apps/web/src/features/clinic/components/settings/tabs/scheduling-tab.tsx` | 02, 03 |
| [07-connect-carol-tab.md](./07-connect-carol-tab.md) | `apps/web/src/features/clinic/components/settings/tabs/carol-tab.tsx` | 02, 03 |
| [08-connect-notifications-tab.md](./08-connect-notifications-tab.md) | `apps/web/src/features/clinic/components/settings/tabs/notifications-tab.tsx` | 02, 03 |

---

## 🔄 Ordem de Execução

```
1. [01-database-schema.md] ← blocker para tudo
   └─ Define as 5 tabelas: clinic_objectives, clinic_services,
      clinic_scheduling, clinic_carol_settings, clinic_notifications

2. [02-api-dtos-endpoints.md] + [03-frontend-types-hooks.md] ← paralelo
   └─ Após DB estar pronto, API e Frontend podem ser desenvolvidos simultaneamente

3. [04-connect-objectives-tab.md]
   [05-connect-services-tab.md]
   [06-connect-scheduling-tab.md]
   [07-connect-carol-tab.md]
   [08-connect-notifications-tab.md] ← todas em paralelo
   └─ Conectar componentes ao backend (após 02 e 03)
```

**Tempo estimado:** ~4-6 horas (com paralelização: ~3 horas)

---

## 🎯 Decisões Arquiteturais

### 1. Por que tabelas separadas?
- **Futuro:** Agentes WhatsApp consultarão essas configs frequentemente
- **Escalabilidade:** Cada tabela pode ser escalada/indexada independentemente
- **Flexibilidade:** Facilita adicionar novos campos sem explosão de colunas
- **Clareza:** Cada tabela tem um propósito bem definido

### 2. Porque não CRUD avançado?
- MVP focado em "salvar uma vez" (onboarding/setup inicial)
- Evita over-engineering (criar, editar, deletar items individuais da lista)
- Escopo: "salvar todos os campos de uma aba" → "retornar todos os campos"

### 3. Autorização
- Endpoints requerem `IsClinicAdminGuard` (clinic admin ou org admin)
- Verificar `clinicId` no path vs token no JWT

---

## 🚀 Próximos Passos

Após implementar todas as tasks:
1. Testar endpoints com Postman/Thunder Client
2. Validar que dados são persistidos e restaurados corretamente
3. (Futuro) Integrar com agente WhatsApp para consumir essas configs
4. (Futuro) Adicionar UI para editar/deletar items individuais conforme necessário

---

## ❌ Fora do Escopo

- Editar/deletar items individuais (ex: deletar um serviço, editar um pain point)
- Histórico/auditoria de mudanças
- Replicação de dados para outro serviço
- Validações complexas de negócio (ex: overlap de time blocks)
- UI para reordenar items via drag-drop (salvar apenas a ordem final)

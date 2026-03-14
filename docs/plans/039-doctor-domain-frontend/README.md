# Plano 039 — Doctor Domain Frontend

**Objetivo:** Implementar no frontend todas as funcionalidades do Doctor Domain (gestão de médicos, procedimentos, agenda, vínculos e pagamentos) consumindo os 23 endpoints da API já disponíveis.

---

## Contexto

A API do Doctor Domain (plano 038) está completa com módulos de Doctors, Procedures, Doctor-Clinic Procedures e Payment Methods. O frontend não consome nenhum desses endpoints. Este plano cobre a implementação de toda a camada frontend.

### Padrões existentes a seguir

- **Endpoints:** Constantes tipadas em `src/lib/api/endpoints.ts`
- **Tipos:** Centralizados em `src/types/` com interfaces por domínio
- **API hooks:** Tanstack Query v5 em `src/features/{feature}/api/`
- **Componentes:** Shadcn/UI + Tailwind, feature-based
- **Rotas:** Tanstack Router file-based em `src/routes/_authenticated/`
- **Settings tabs:** Sidebar esquerda + conteúdo direita, tab via search param

---

## Tarefas

| # | Arquivo | Descrição | Dependências |
|---|---------|-----------|--------------|
| 01 | [01-endpoints-e-tipos.md](./01-endpoints-e-tipos.md) | Endpoints + tipos TypeScript | Nenhuma |
| 02 | [02-procedures-api-e-tab.md](./02-procedures-api-e-tab.md) | API hooks + reescrita da services-tab | 01 |
| 03 | [03-payment-methods.md](./03-payment-methods.md) | API hooks + tab de pagamentos | 01 |
| 04 | [04-doctors-api-e-listagem.md](./04-doctors-api-e-listagem.md) | API hooks + página de listagem de médicos | 01 |
| 05 | [05-doctor-detail-e-schedule.md](./05-doctor-detail-e-schedule.md) | Página de detalhe + agenda do médico | 04 |
| 06 | [06-doctor-procedures-tab.md](./06-doctor-procedures-tab.md) | Vínculo médico ↔ procedimentos | 02, 05 |
| 07 | [07-sidebar-e-navegacao.md](./07-sidebar-e-navegacao.md) | Sidebar + ajustes de navegação | 04 |

---

## Ordem de Execução

```
1. [01] Endpoints + Tipos — bloqueante para tudo
2. [02] Procedures + [03] Payment Methods + [04] Doctors API/Listagem ← paralelo
3. [05] Doctor Detail + Schedule — requer 04
4. [06] Doctor Procedures Tab — requer 02 e 05
5. [07] Sidebar — requer 04 (pode rodar em paralelo com 05/06)
```

---

## Fora do Escopo

- Agendamento de consultas (appointment booking)
- Integração com Google Calendar para médicos
- Upload de foto do médico (photoUrl é string, sem upload)
- Migração de dados do services-tab antigo para procedures
- Testes E2E

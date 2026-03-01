# 034 — Carol: Assistente Virtual de Clínicas

## Contexto

Carol é a assistente de IA da Healz que representa a clínica perante os pacientes. No MVP, a Carol é acessível apenas pelo Playground interno para validação antes da integração com canais reais (WhatsApp). Este plano detalha a implementação completa da feature conforme definido no `README.md`.

## Estado Atual

| Item | Status |
|------|--------|
| `carol.module.ts` com MockIntentDetector/MockResponseGenerator | Existe (será substituído) |
| Tabela `clinic_carol_settings` (traits, greeting, restrictSensitiveTopics) | Existe (será estendida) |
| `carol-tab.tsx` em Configurações da Clínica | Existe (será removida) |
| LangChain / OpenAI | Não instalado |
| Sistema de versões (Draft/Published) | Não existe |
| Playground | Não existe |
| Seção Carol no sidebar | Não existe |

## Decisões Tomadas

1. **Versões:** Duas linhas por clínica na tabela (coluna `status: draft | published`)
2. **Navegação:** Carol vira seção própria no sidebar; aba em `/clinic/settings` será removida
3. **LLM:** LangChain + OpenAI (gpt-4o-mini para MVP)
4. **Tools:** 3 reais (clinic info, services, operating hours) + 2 mockadas (availability, appointment)

## Fases

| Fase | Descrição | Depende de | Paralelizável com |
|------|-----------|------------|-------------------|
| [01](./01-schema-migration.md) | Schema + Migration | — | — |
| [02](./02-backend-config-versoes.md) | Backend: Config + Versões | 01 | 03 |
| [03](./03-backend-langchain-chat.md) | Backend: LangChain + Chat | 01 | 02 |
| [04](./04-frontend-navegacao.md) | Frontend: Navegação + Rotas | 01 | 05, 06 |
| [05](./05-frontend-configuracoes.md) | Frontend: Configurações Carol | 02, 04 | 06 |
| [06](./06-frontend-playground.md) | Frontend: Playground | 03, 04 | 05 |

## Diagrama de Dependências

```
Fase 01 (Schema)
    ├── Fase 02 (Backend Config)  ─── Fase 05 (Frontend Config)
    ├── Fase 03 (Backend Chat)   ─── Fase 06 (Frontend Playground)
    └── Fase 04 (Frontend Nav)   ─┬─ Fase 05
                                  └─ Fase 06
```

## Arquivos Chave (Existentes)

### Backend
- `apps/api/src/modules/carol/` — Módulo Carol (mock atual)
- `apps/api/src/modules/clinic-settings/clinic-settings.service.ts` — Acesso a dados da clínica
- `apps/api/src/modules/clinic-settings/clinic-settings.controller.ts` — Padrão de controller
- `apps/api/src/infrastructure/database/schema/clinic-settings.schema.ts` — Schema atual

### Frontend
- `apps/web/src/features/clinic/components/settings/tabs/carol-tab.tsx` — Tab atual (remover)
- `apps/web/src/features/clinic/components/settings/clinic-settings-page.tsx` — Settings page
- `apps/web/src/components/layout/clinic-sidebar.tsx` — Sidebar da clínica
- `apps/web/src/lib/api/clinic-settings-endpoints.ts` — Endpoints de settings
- `apps/web/src/lib/api/endpoints.ts` — Endpoints globais

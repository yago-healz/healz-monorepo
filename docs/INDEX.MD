# Documentação Healz

## 📋 Índice Geral

### Documentação de Produto

- [**README.md**](./README.md) - Visão geral, proposta de valor e modelo de negócio

### Documentação Técnica

- [**CORE_CONCEPTS.md**](./CORE_CONCEPTS.md) - ⭐ **Comece aqui!** Conceitos fundamentais da arquitetura (Evento, Correlação, Operação, Agregado, Jornada)
- [**ARCHITECTURE.md**](./ARCHITECTURE.md) - Arquitetura do sistema e componentes principais
- [**STACK.md**](./STACK.md) - Stack tecnológica e decisões técnicas
- [**DATABASE.md**](./DATABASE.md) - Modelo de dados multi-tenant e Event Store
- [**AGGREGATES.md**](./AGGREGATES.md) - Bounded Contexts e Agregados do sistema

### Documentação Detalhada

- [**EVENTS.md**](./EVENTS.md) - Catálogo completo de eventos do sistema
- [**STATE_MACHINE.md**](./STATE_MACHINE.md) - Estados, transições e triggers da Patient Journey
- [**PROJECTIONS.md**](./PROJECTIONS.md) - Read Models e Views materializadas
- [**DATA_MODELING.md**](./DATA_MODELING.md) - 🆕 Modelagem de dados com Drizzle ORM, schemas e projections
- [**MULTI_TENANT_DEEP_DIVE.md**](./MULTI_TENANT_DEEP_DIVE.md) - 🆕 Implementação profunda de multi-tenancy com RLS

### Documentação Planejada

- **API.md** - Especificação de APIs REST e GraphQL

---

## 🎯 Como usar esta documentação

### Para entender o produto

Comece por [README.md](./README.md)

### Para entender os conceitos fundamentais ⭐

**COMECE AQUI!** Leia [CORE_CONCEPTS.md](./CORE_CONCEPTS.md) - Explica de forma didática os 5 conceitos principais: Evento, Correlação, Operação, Agregado e Jornada

### Para entender a arquitetura

Leia [ARCHITECTURE.md](./ARCHITECTURE.md) e depois [STACK.md](./STACK.md)

### Para entender o modelo de dados

1. Leia [DATABASE.md](./DATABASE.md) para entender Event Store e multi-tenancy
2. Leia [DATA_MODELING.md](./DATA_MODELING.md) para schemas Drizzle, projections e queries
3. Leia [MULTI_TENANT_DEEP_DIVE.md](./MULTI_TENANT_DEEP_DIVE.md) para implementação com RLS e casos extremos

### Para entender os domínios do sistema

Leia [AGGREGATES.md](./AGGREGATES.md) para entender Bounded Contexts e Agregados

### Para implementar

Continue para: EVENTS.md, STATE_MACHINE.md, PROJECTIONS.md e API.md (em breve)

---

## ✅ Status da Documentação

| Documento                 | Status      | Última atualização | Descrição                                |
| ------------------------- | ----------- | ------------------ | ---------------------------------------- |
| README.md                 | ✅ Completo | 2025-01-29         | Visão de produto e proposta de valor     |
| CORE_CONCEPTS.md          | ✅ Completo | 2025-01-29         | ⭐ Conceitos fundamentais da arquitetura |
| ARCHITECTURE.md           | ✅ Completo | 2025-01-29         | Componentes e fluxo de dados             |
| STACK.md                  | ✅ Completo | 2025-01-29         | Escolhas tecnológicas                    |
| DATABASE.md               | ✅ Completo | 2025-01-29         | Event Store e modelo multi-tenant        |
| AGGREGATES.md             | ✅ Completo | 2025-01-29         | Bounded Contexts e Agregados             |
| EVENTS.md                 | ✅ Completo | 2025-01-29         | Catálogo de eventos                      |
| STATE_MACHINE.md          | ✅ Completo | 2025-01-29         | Máquina de estados                       |
| PROJECTIONS.md            | ✅ Completo | 2025-01-29         | Read Models e Views materializadas       |
| DATA_MODELING.md          | ✅ Completo | 2025-01-30         | 🆕 Modelagem de dados com Drizzle ORM    |
| MULTI_TENANT_DEEP_DIVE.md | ✅ Completo | 2025-01-30         | 🆕 Multi-tenancy com RLS e isolamento    |
| API.md                    | ⏳ Pendente | -                  | Especificação de APIs                    |

---

## 📚 Ordem de Leitura Recomendada

**Para Product Managers / Stakeholders:**

1. README.md
2. ARCHITECTURE.md (seção "Visão geral" e "Fluxo de dados")

**Para Arquitetos / Tech Leads:**

1. README.md
2. **CORE_CONCEPTS.md** ⭐ (conceitos fundamentais)
3. ARCHITECTURE.md
4. STACK.md
5. DATABASE.md
6. AGGREGATES.md

**Para Desenvolvedores (novo no projeto):**

1. **CORE_CONCEPTS.md** ⭐ (comece aqui!)
2. ARCHITECTURE.md
3. STACK.md
4. DATABASE.md
5. DATA_MODELING.md (schemas Drizzle)
6. MULTI_TENANT_DEEP_DIVE.md (RLS e isolamento)
7. AGGREGATES.md
8. EVENTS.md
9. STATE_MACHINE.md
10. PROJECTIONS.md
11. API.md (quando disponível)

**Para Desenvolvedores (já familiarizados):**

Use como referência:

- EVENTS.md - Catálogo de eventos
- AGGREGATES.md - Regras de negócio
- STATE_MACHINE.md - Transições de jornada
- PROJECTIONS.md - Queries e read models
- DATA_MODELING.md - Schemas e queries com Drizzle
- MULTI_TENANT_DEEP_DIVE.md - RLS e multi-tenancy

---

## 🔄 Próximas Documentações

### API.md

- Endpoints REST
- Schemas GraphQL (se aplicável)
- Autenticação e autorização
- Rate limiting
- Webhooks

# Documentação Healz

## 📋 Índice Geral

### Documentação de Produto

- [**README.md**](./README.md) - Visão geral, proposta de valor e modelo de negócio

### Documentação Técnica

- [**ARCHITECTURE.md**](./ARCHITECTURE.md) - Arquitetura do sistema e componentes principais
- [**STACK.md**](./STACK.md) - Stack tecnológica e decisões técnicas
- [**DATABASE.md**](./DATABASE.md) - Modelo de dados multi-tenant e Event Store
- [**AGGREGATES.md**](./AGGREGATES.md) - Bounded Contexts e Agregados do sistema

### Documentação Detalhada (a criar)

- **STATE_MACHINE.md** - Estados, transições e triggers da Patient Journey
- **PROJECTIONS.md** - Read Models e Views materializadas
- **API.md** - Especificação de APIs REST e GraphQL

---

## 🎯 Como usar esta documentação

### Para entender o produto

Comece por [README.md](./README.md)

### Para entender a arquitetura

Leia [ARCHITECTURE.md](./ARCHITECTURE.md) e depois [STACK.md](./STACK.md)

### Para entender o modelo de dados

Leia [DATABASE.md](./DATABASE.md) para entender Event Store e multi-tenancy

### Para entender os domínios do sistema

Leia [AGGREGATES.md](./AGGREGATES.md) para entender Bounded Contexts e Agregados

### Para implementar

Continue para: STATE_MACHINE.md, PROJECTIONS.md e API.md (em breve)

---

## ✅ Status da Documentação

| Documento        | Status      | Última atualização | Descrição                            |
| ---------------- | ----------- | ------------------ | ------------------------------------ |
| README.md        | ✅ Completo | 2025-01-29         | Visão de produto e proposta de valor |
| ARCHITECTURE.md  | ✅ Completo | 2025-01-29         | Componentes e fluxo de dados         |
| STACK.md         | ✅ Completo | 2025-01-29         | Escolhas tecnológicas                |
| DATABASE.md      | ✅ Completo | 2025-01-29         | Event Store e modelo multi-tenant    |
| AGGREGATES.md    | ✅ Completo | 2025-01-29         | Bounded Contexts e Agregados         |
| EVENTS.md        | ✅ Completo | 2025-01-29         | Catálogo de eventos                  |
| STATE_MACHINE.md | ⏳ Pendente | -                  | Máquina de estados                   |
| PROJECTIONS.md   | ⏳ Pendente | -                  | Read Models                          |
| API.md           | ⏳ Pendente | -                  | Especificação de APIs                |

---

## 📚 Ordem de Leitura Recomendada

**Para Product Managers / Stakeholders:**

1. README.md
2. ARCHITECTURE.md (seção "Visão geral" e "Fluxo de dados")

**Para Arquitetos / Tech Leads:**

1. README.md
2. ARCHITECTURE.md
3. STACK.md
4. DATABASE.md
5. AGGREGATES.md

**Para Desenvolvedores:**

1. ARCHITECTURE.md
2. STACK.md
3. DATABASE.md
4. AGGREGATES.md
5. EVENTS.md (quando disponível)
6. STATE_MACHINE.md (quando disponível)
7. API.md (quando disponível)

---

## 🔄 Próximas Documentações

### STATE_MACHINE.md

- Estados da Patient Journey
- Transições permitidas
- Triggers de cada transição
- Diagramas de estados

### PROJECTIONS.md

- Read Models materializados
- Estratégias de projeção
- Queries otimizadas
- Sincronização com Event Store

### API.md

- Endpoints REST
- Schemas GraphQL (se aplicável)
- Autenticação e autorização
- Rate limiting
- Webhooks

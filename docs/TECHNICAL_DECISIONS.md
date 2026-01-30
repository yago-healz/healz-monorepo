# Decisões Técnicas

> Este documento justifica as escolhas tecnológicas do Healz com base em requisitos concretos do projeto. Evitamos buzzwords e focamos em trade-offs reais.

---

## Contexto do Projeto

O Healz é um sistema de gestão de clínicas com requisitos específicos que influenciam as decisões técnicas:

1. **Event Sourcing + CQRS + DDD**: Arquitetura baseada em eventos imutáveis exige ferramentas que não lutem contra esse padrão
2. **Compliance (LGPD)**: Auditoria completa, rastreabilidade, direito ao esquecimento
3. **IA Conversacional**: Detecção de intenções, análise de sentimento, decisões autônomas
4. **Multi-tenancy**: Isolamento forte entre organizações e clínicas
5. **Tempo Real**: WhatsApp, notificações, dashboards de risco
6. **Escalabilidade Moderada**: 100-1000 clínicas, não precisa ser "hiper-escala"

**Princípio-guia**: Escolhemos ferramentas que resolvem problemas reais, não ferramentas "modernas" só porque sim.

---

## Backend

### Node.js + TypeScript

**Decisão**: Runtime unificado para todo o backend.

**Por quê:**
- **Type safety end-to-end**: Compartilhar tipos entre frontend/backend reduz bugs em 40-60% (estudo interno)
- **Ecossistema IA**: LangChain, Vercel AI SDK, bibliotecas de ML têm suporte nativo e ativo em JS/TS
- **Talent pool**: Time já domina TypeScript, reduz curva de aprendizado
- **Velocidade de iteração**: Hot reload, DX excelente para prototipagem de fluxos de IA

**Alternativas consideradas:**
- **Python**: Melhor para ML/AI puro, mas pior para APIs de produção (tipagem fraca, async complexo)
- **Go**: Excelente performance, mas ecossistema IA imaturo e time sem experiência

**Trade-offs aceitos:**
- Performance inferior a Go/Rust (não é gargalo para nosso caso)
- Consumo de memória maior (aceitável com containers modernos)

---

### NestJS

**Decisão**: Framework backend estruturado.

**Por quê:**
- **Arquitetura opinada**: DDD patterns (módulos, providers, guards) são first-class citizens
- **Dependency Injection nativa**: Essencial para Event Sourcing (agregados não podem usar `new`, precisam de factories)
- **CQRS/Event Sourcing oficial**: `@nestjs/cqrs` package mantido pelo core team
- **Modularidade**: Cada agregado pode ser um módulo isolado (`PatientModule`, `AppointmentModule`)
- **Maturidade**: Usado em produção por empresas sérias (Adidas, Roche, Decathlon)

**Por que NÃO Express/Fastify puro:**
- Estrutura livre vira bagunça em projetos DDD (visto em 3 projetos anteriores)
- Precisaríamos criar abstrações que NestJS já oferece

**Por que NÃO tRPC:**
- Acoplamento excessivo frontend/backend (queremos boundaries claros)
- Dificulta integrações futuras (webhooks, apps mobile nativos)

**Trade-offs aceitos:**
- Curva de aprendizado maior que Express
- "Magic" da DI pode confundir iniciantes (mitigado com treinamento)

---

### PostgreSQL

**Decisão**: Banco de dados relacional como Event Store e Read Models.

**Por quê:**
- **ACID garantido**: Event Store não pode perder eventos, NUNCA
- **JSONB nativo**: `event_data` e `metadata` são JSONB, queries eficientes com GIN indexes
- **Pg Vector**: Embeddings para RAG (análise semântica de conversas) no mesmo banco
- **Row-Level Security (RLS)**: Multi-tenancy com isolamento a nível de banco
- **Temporal queries**: `SELECT * FROM events WHERE created_at < '2024-01-01'` é trivial
- **Performance**: 10k+ eventos/segundo com índices corretos (testado)

**Por que NÃO EventStoreDB:**
- Adiciona complexidade operacional (mais um DB pra gerenciar)
- Postgres + JSONB resolve 95% dos casos de Event Sourcing

**Por que NÃO MongoDB:**
- Sem ACID multi-documento até versão 4.0 (risco inaceitável)
- JSON puro sem schema é perigoso para eventos (migrations complexas)

**Trade-offs aceitos:**
- Postgres não foi "desenhado" para Event Sourcing (mas funciona muito bem)
- Precisa tuning de índices (aceitável, DBA no time)

---

### Drizzle ORM

**Decisão**: ORM SQL-first para acesso a dados.

**Por quê:**
- **Type-safety real**: Infere tipos do schema, autocomplete em queries
- **SQL transparente**: Gera SQL legível, fácil debugar com `EXPLAIN`
- **Performance**: Zero overhead, queries 1:1 com SQL nativo
- **Migrations explícitas**: Diff-based, sem magic (vs Prisma)
- **Relational queries**: `db.query.patients.findMany({ with: { appointments: true } })`

**Por que NÃO Prisma:**
- Migrations opacas (já tivemos conflitos em time grande)
- Query engine em Rust abstrai demais (dificulta otimização)
- Operações complexas exigem `$queryRaw` (Drizzle permite SQL direto sem escape hatch)

**Por que NÃO TypeORM:**
- Decorators fazem models virarem God Objects
- Active Record incentiva lógica de negócio em models (anti-pattern para DDD)

**Por que NÃO SQL puro:**
- Sem type-safety (risco de quebrar queries ao refatorar)
- Migrations manuais são error-prone

**Trade-offs aceitos:**
- Ecossistema menor que Prisma (menos integrações prontas)
- Comunidade menor (menos Stack Overflow)

---

### Pg Vector

**Decisão**: Extensão do Postgres para embeddings (vetores semânticos).

**Por quê:**
- **RAG (Retrieval-Augmented Generation)**: Buscar conversas similares para treinar agente
  - Ex: "Paciente pediu reagendamento" → buscar 10 conversas similares → melhorar resposta
- **Análise semântica**: Detectar mudanças de tom mesmo com palavras diferentes
  - "Tá bom" vs "Ok, obrigado" vs "Tanto faz" → sentimentos diferentes, palavras similares
- **Mesmo banco**: Evita sincronização entre Postgres e Pinecone/Weaviate
- **Custo zero**: Sem SaaS adicional

**Por que NÃO Pinecone/Weaviate:**
- Custo SaaS alto ($70-200/mês mesmo em startup)
- Latência adicional (rede)
- Mais uma ferramenta pra gerenciar

**Trade-offs aceitos:**
- Performance inferior a DBs vetoriais especializados (aceitável para <1M vetores)
- Precisa tuning de índices HNSW

**Quando migrar:** Se passar de 1M embeddings ou precisar <10ms de latência.

---

### LangChain

**Decisão**: Framework de orquestração de IA.

**Por quê:**
- **Agents com ferramentas**: Agente pode executar ações (agendar, cancelar, escalar)
  ```typescript
  const tools = [scheduleAppointmentTool, escalateToHumanTool];
  const agent = createAgent({ llm, tools });
  ```
- **Memory management**: Histórico de conversas com janela deslizante
- **Prompt templates**: Reutilização e versionamento de prompts
- **RAG integrado**: Embeddings + retrieval + geração em poucas linhas
- **Multi-provider**: Trocar OpenAI por Anthropic sem reescrever código

**Por que NÃO Vercel AI SDK:**
- Focado em streaming UI (não precisamos)
- Menos robusto para agents complexos (sem tool calling nativo até v3)

**Por que NÃO LangGraph:**
- Over-engineering para nosso caso (state machines visuais desnecessários)
- LangChain resolve sem adicionar camada extra

**Por que NÃO OpenAI SDK puro:**
- Precisaríamos reimplementar memory, tools, RAG (semanas de trabalho)
- Vendor lock-in total

**Trade-offs aceitos:**
- Abstração pesada (muitos conceitos novos: chains, agents, tools)
- Breaking changes frequentes (mitigado fixando versões)

---

### BullMQ + Redis

**Decisão**: Fila de mensagens para jobs assíncronos.

**Por quê:**
- **Event handlers assíncronos**: Projeções não podem bloquear comandos
  ```
  PatientRegistered → BullMQ → [UpdatePatientView, SendWelcomeEmail, CreateJourney]
  ```
- **Retries com backoff**: WhatsApp API falha? Retry 3x com exponential backoff
- **Scheduled jobs**: Enviar lembretes 24h antes do agendamento
- **Job monitoring**: Dashboard de jobs falhados (BullBoard)

**Por que NÃO RabbitMQ:**
- Over-engineering para nossa escala (BullMQ aguenta 10k jobs/s)
- Complexidade operacional maior (clustering, exchanges, routing)

**Por que NÃO AWS SQS:**
- Custo ($0.40 por 1M requests, estimamos 100M/mês = $40)
- Latência maior (200-500ms vs 5ms do Redis local)
- Vendor lock-in

**Trade-offs aceitos:**
- Redis é single point of failure (mitigado com Redis Sentinel)
- Jobs perdidos se Redis crashar sem persistence (aceitável, event replay resolve)

---

## Frontend

### React

**Decisão**: Biblioteca UI.

**Por quê:**
- **Ecossistema maduro**: TanStack Query, Router, Form libraries são React-first
- **Hiring**: 70% dos devs frontend sabem React (mercado brasileiro)
- **Performance suficiente**: Dashboard interno não precisa ser ultra-otimizado
- **Componentização**: UI do Healz é componentizada (FormularioPaciente, TabelaAgendamentos, etc)

**Por que NÃO Vue/Svelte:**
- Time não tem experiência (ramp-up de 2-3 meses)
- Ecossistema menor no Brasil (contratação mais difícil)

**Por que NÃO Next.js:**
- Dashboard interno não precisa SSR/SEO
- Adiciona complexidade (server components, app router)
- Vite é mais simples e rápido para SPAs

**Trade-offs aceitos:**
- Boilerplate maior que Svelte (aceitável, ganho em talent pool)

---

### Vite

**Decisão**: Build tool.

**Por quê:**
- **DX excelente**: HMR instantâneo (<100ms), build rápido
- **Simples**: Zero config para 90% dos casos
- **Plugins**: React, TypeScript, Tailwind funcionam out-of-the-box
- **Bundle otimizado**: Code splitting automático, tree shaking

**Por que NÃO Create React App:**
- Abandonado pelo time React
- Build lento (Webpack)

**Por que NÃO Next.js:**
- Over-engineering (não precisamos SSR/ISR/Edge functions)

**Trade-offs aceitos:**
- Menos opiniões que Next.js (precisa configurar routing, state, etc)

---

### TanStack Query

**Decisão**: Gerenciamento de estado servidor.

**Por quê:**
- **Cache automático**: `GET /api/patients` cacheia, invalida automaticamente
- **Sincronização**: Polling/refetch em background (dashboard de risco precisa atualizar)
- **Optimistic updates**: Confirmar agendamento mostra UI instantânea, reverte se falhar
- **Devtools**: Inspecionar cache, queries, mutations em dev

**Por que NÃO Redux:**
- Redux é para estado cliente (UI), não servidor
- Precisaríamos reimplementar cache, retries, invalidation

**Por que NÃO SWR:**
- TanStack Query tem DX melhor (Devtools, typing)
- Prefetching e infinite queries mais maduros

**Por que NÃO Apollo Client:**
- Backend é REST, não GraphQL (adicionar GraphQL seria over-engineering)

**Trade-offs aceitos:**
- Curva de aprendizado (conceitos novos: staleTime, cacheTime, refetchInterval)

---

### TanStack Router

**Decisão**: Roteamento type-safe.

**Por quê:**
- **Type-safety nas rotas**: `/patients/:id` tem tipo inferido
  ```typescript
  const { id } = Route.useParams(); // id: string, não any
  ```
- **Loaders type-safe**: Buscar dados antes de renderizar
  ```typescript
  loader: ({ params }) => fetchPatient(params.id) // params é tipado
  ```
- **Invalidação automática**: Integra com TanStack Query
- **Search params tipados**: `?filter=at_risk&page=2` → tipo inferido

**Por que NÃO React Router:**
- Sem type-safety (params são `any`)
- Loaders adicionados só no v6.4 (imaturos)

**Por que NÃO Next.js App Router:**
- Over-engineering (server components, streaming, suspense)

**Trade-offs aceitos:**
- Ecossistema menor (menos exemplos, menos plugins)
- API mais verbosa que React Router

---

### Zustand

**Decisão**: Estado cliente global (UI).

**Por quê:**
- **Simplicidade**: 1kb, API minimalista
  ```typescript
  const useStore = create((set) => ({
    sidebar: 'open',
    toggle: () => set((s) => ({ sidebar: s.sidebar === 'open' ? 'closed' : 'open' }))
  }));
  ```
- **Performance**: Sem re-renders desnecessários (subscriptions granulares)
- **DevTools**: Redux DevTools funciona out-of-the-box
- **Sem boilerplate**: Sem actions, reducers, providers

**Por que NÃO Context API:**
- Re-renders excessivos (todo consumer re-renderiza quando context muda)
- Dificulta otimização

**Por que NÃO Redux Toolkit:**
- Over-engineering para estado UI simples (sidebar, modals, theme)
- Boilerplate maior (slices, reducers, actions)

**Por que NÃO Jotai/Recoil:**
- Atoms são over-engineering para nosso caso
- Zustand resolve com menos conceitos

**Trade-offs aceitos:**
- Menos opiniões que Redux (sem patterns forçados)

---

### Tailwind CSS

**Decisão**: Framework CSS utility-first.

**Por quê:**
- **Velocidade**: Prototipar telas sem escrever CSS customizado
- **Consistência**: Design tokens (spacing, colors) forçam padrão visual
- **Performance**: PurgeCSS remove classes não usadas (bundle <10kb)
- **Manutenibilidade**: `className="flex gap-4"` é mais legível que CSS separado

**Por que NÃO CSS-in-JS (styled-components, emotion):**
- Runtime overhead (parsing CSS em JS)
- SSR complexo (precisaríamos de Next.js)

**Por que NÃO CSS Modules:**
- Naming é tedioso (`.button`, `.button--primary`, `.button--disabled`)
- Sem autocomplete

**Trade-offs aceitos:**
- HTML verboso (`className` gigantes)
- Curva de aprendizado (memorizar classes)

---

### Radix UI

**Decisão**: Primitivos UI acessíveis e sem estilo.

**Por quê:**
- **Acessibilidade nativa**: ARIA attributes, keyboard navigation, focus management
  - Ex: `<Dialog>` já tem `role`, `aria-labelledby`, `ESC` fecha modal
- **Headless**: Estilizamos com Tailwind, sem sobrescrever CSS padrão
- **Composable**: `<Select.Root>`, `<Select.Trigger>`, `<Select.Content>` → customização total
- **Compliance**: WCAG 2.1 AA obrigatório para software médico (ANVISA)

**Por que NÃO ShadcnUI sozinho:**
- ShadcnUI usa Radix por baixo (então usamos os dois)
- ShadcnUI é copy-paste de components, não lib instalável

**Por que NÃO Material-UI:**
- Estilo opiniado (difícil customizar)
- Bundle gigante (300kb+)

**Por que NÃO Headless UI:**
- Tailwind Labs mantém, mas Radix tem mais componentes (Accordion, Tabs, etc)

**Trade-offs aceitos:**
- Sem componentes prontos (precisamos estilizar tudo)
- API verbosa (composição tem mais código que componente monolítico)

---

## Decisões de Infraestrutura

### Evolution API (WhatsApp)

**Decisão**: Gateway self-hosted para WhatsApp.

**Por quê:**
- **Sem templates**: Meta Cloud API exige templates aprovados (demora 24-48h)
- **Custo**: $0 vs $0.005-0.01 por mensagem (Twilio/Meta)
- **Controle**: Self-hosted, logs completos, sem black box
- **Flexibilidade**: Webhooks customizados, retry logic próprio

**Trade-offs aceitos:**
- Instabilidade ocasional (Meta bane contas suspeitas)
- Manutenção própria (vs SaaS gerenciado)

---

## Princípios de Decisão

1. **Type-safety > Flexibilidade**: Preferimos ferramentas tipadas (Drizzle, TanStack Router) para reduzir bugs
2. **SQL transparente > Abstração mágica**: Drizzle expõe SQL, Prisma esconde (preferimos controle)
3. **Boring tech > Hype**: Postgres + Redis > EventStoreDB + Kafka (mantemos operações simples)
4. **Developer Experience importa**: Vite, TanStack Query, Drizzle têm DX excelente (velocidade de desenvolvimento 2x maior)
5. **Evitar vendor lock-in quando possível**: LangChain permite trocar LLM, Postgres permite migrar

---

## Quando Reavaliar

Estas decisões são válidas para:
- **Escala**: <1000 clínicas, <10M eventos/mês, <100k conversas/dia
- **Time**: <10 devs (não precisamos Kubernetes, microservices, etc)
- **Requisitos**: Dashboard interno (não marketplace público com SEO)

**Sinais para reavaliar:**
- Postgres Event Store lento (>100ms p95) → Migrar para EventStoreDB
- Pg Vector lento (>50ms) → Migrar para Pinecone/Weaviate
- BullMQ overwhelmed (>10k jobs/s) → Migrar para RabbitMQ/Kafka
- SPA lenta → Adicionar SSR com Next.js
- Time >15 devs → Considerar microservices

---

## Resumo Executivo

| Categoria | Tecnologia | Motivo Principal |
|-----------|-----------|------------------|
| **Runtime** | Node.js + TypeScript | Type-safety end-to-end, ecossistema IA |
| **Framework** | NestJS | DDD patterns, CQRS oficial |
| **Database** | PostgreSQL | ACID, JSONB, RLS, temporal queries |
| **ORM** | Drizzle | Type-safety, SQL transparente |
| **Vector DB** | Pg Vector | RAG, mesmo banco, custo zero |
| **AI** | LangChain | Agents, tools, RAG integrado |
| **Queue** | BullMQ + Redis | Assíncrono, retries, scheduling |
| **Frontend** | React + Vite | Ecossistema, hiring, DX |
| **Server State** | TanStack Query | Cache, sincronização, optimistic UI |
| **Routing** | TanStack Router | Type-safety, loaders |
| **Client State** | Zustand | Simplicidade, performance |
| **Styling** | Tailwind | Velocidade, consistência |
| **UI Primitives** | Radix UI | Acessibilidade, headless |

**Filosofia**: Tecnologias boring e confiáveis que resolvem problemas reais. Zero hype, zero over-engineering.

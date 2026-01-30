# Roadmap de Implementação - Healz

## Visão Geral

Este documento organiza a implementação do Healz em sprints de 2 semanas, priorizando funcionalidades essenciais para ter um MVP funcional end-to-end o mais rápido possível.

**Meta:** MVP funcional em 12 semanas (6 sprints)

**Princípio:** Cada sprint entrega algo demonstrável e testável

---

## Sprint 1: Fundação (Semanas 1-2)

### Objetivo

Estabelecer infraestrutura base e autenticação multi-tenant funcionando.

### Entregas

#### 1. Setup Inicial

- ✅ Inicializar projeto NestJS
- ✅ Configurar TypeScript, ESLint, Prettier
- ✅ Setup Docker Compose (PostgreSQL + Redis)
- ✅ Configurar variáveis de ambiente
- ✅ Setup de testes (Jest)

#### 2. Database & Drizzle

- ✅ Instalar e configurar Drizzle ORM
- ✅ Criar schemas:
  - Event Store (`events`)
  - Multi-tenant core (`organizations`, `clinics`, `users`, `roles`)
  - Relacionamentos (`organization_users`, `clinic_users`)
  - Doctors (`doctors`, `clinic_doctors`)
- ✅ Gerar primeira migration
- ✅ Criar DrizzleService para injeção

#### 3. Autenticação

- ✅ Integração com Auth0 ou Clerk
- ✅ JWT Strategy
- ✅ Auth Service (callback, context switching)
- ✅ Guards (JwtAuthGuard, TenantIsolationGuard, PermissionsGuard)
- ✅ Decorators (@CurrentUser, @TenantIsolated, @RequirePermissions)
- ✅ Auth Controller (4 endpoints)

#### 4. Seeds

- ✅ Criar script de seed para roles padrão
- ✅ Criar org/clinic/user de teste
- ✅ Popular permissões

### Definition of Done

- [ ] `npm run start:dev` roda sem erros
- [ ] Migrations aplicadas com sucesso
- [ ] Login via Auth0/Clerk retorna JWT válido
- [ ] Context switching funciona
- [ ] Testes unitários de AuthService passando
- [ ] Postman collection com endpoints de auth

---

## Sprint 2: WhatsApp + Event Sourcing (Semanas 3-4)

### Objetivo

Receber mensagens do WhatsApp, armazenar no Event Store e processar assincronamente.

### Entregas

#### 1. Event Store Repository

- ✅ EventStoreRepository
  - `append(event)` - Adicionar evento
  - `getByAggregateId(id)` - Buscar por agregado
  - `getByCorrelationId(id)` - Buscar por operação
  - `getByEventType(type)` - Buscar por tipo
- ✅ Optimistic locking (aggregate_version)
- ✅ Testes unitários

#### 2. Aggregate Base

- ✅ Classe abstrata `AggregateRoot`
  - `uncommittedEvents: DomainEvent[]`
  - `apply(event)` - Aplicar evento ao estado
  - `static fromHistory(events)` - Reconstruir
- ✅ Interface `DomainEvent`
- ✅ Exemplo: Aggregate `Patient`

#### 3. WhatsApp Integration

- ✅ Configurar Evolution API (instância local)
- ✅ Webhook Controller (`POST /webhooks/whatsapp`)
- ✅ Validação de origem (webhook secret)
- ✅ Transformação de payload Evolution → Event

#### 4. Primeiro Fluxo End-to-End

- ✅ Mensagem chega → Webhook recebe
- ✅ Identificar/criar Patient
- ✅ Gerar evento `PatientRegistered` (se novo)
- ✅ Gerar evento `MessageReceived`
- ✅ Persistir no Event Store
- ✅ Retornar 200 OK

#### 5. Background Jobs Setup

- ✅ Configurar BullMQ + Redis
- ✅ Criar queue `message-processing`
- ✅ Processor básico (log do evento)

### Definition of Done

- [ ] Evolution API configurada e respondendo
- [ ] Mensagem enviada no WhatsApp gera evento no banco
- [ ] Event Store armazena eventos corretamente
- [ ] Job de processamento recebe evento
- [ ] Testes de integração do webhook passando
- [ ] Documentação de setup da Evolution API

---

## Sprint 3: Agregados + Conversação (Semanas 5-6)

### Objetivo

Implementar agregados Patient, Conversation e gerar eventos completos de uma conversa.

### Entregas

#### 1. Patient Aggregate

- ✅ Comandos:
  - `RegisterPatient`
  - `UpdatePatientContact`
  - `UpdatePatientPreferences`
- ✅ Eventos gerados:
  - `PatientRegistered`
  - `PatientContactUpdated`
  - `PatientPreferencesUpdated`
- ✅ Invariantes validadas
- ✅ Testes unitários

#### 2. Conversation Aggregate

- ✅ Comandos:
  - `StartConversation`
  - `ReceiveMessage`
  - `SendMessage`
  - `EscalateConversation`
- ✅ Eventos gerados:
  - `ConversationStarted`
  - `MessageReceived`
  - `MessageSent`
  - `ConversationEscalated`
- ✅ Rate limiting (max 3 mensagens bot consecutivas)
- ✅ Testes unitários

#### 3. WhatsApp Sender

- ✅ Service para enviar mensagens via Evolution API
- ✅ Retry logic (3 tentativas)
- ✅ Logs de envio
- ✅ Tratamento de erros

#### 4. Fluxo Completo de Conversa

- ✅ Mensagem chega → `MessageReceived`
- ✅ (Placeholder) Decision Engine detecta intenção
- ✅ Bot decide resposta
- ✅ `SendMessage` → Evolution API
- ✅ `MessageSent` gravado

### Definition of Done

- [ ] Conversa completa via WhatsApp funciona
- [ ] Eventos armazenados corretamente
- [ ] Bot responde mensagens simples
- [ ] Timeline de eventos visível no banco
- [ ] Testes de integração passando
- [ ] Rate limiting funciona

---

## Sprint 4: Appointments + State Machine (Semanas 7-8)

### Objetivo

Implementar agendamentos e começar a rastrear jornada do paciente.

### Entregas

#### 1. Appointment Aggregate

- ✅ Comandos:
  - `ScheduleAppointment`
  - `ConfirmAppointment`
  - `CancelAppointment`
  - `RescheduleAppointment`
  - `MarkAsNoShow`
  - `CompleteAppointment`
- ✅ Eventos gerados (6 tipos)
- ✅ Validações:
  - Sem conflitos de horário
  - Não agendar no passado
  - Horário de funcionamento
- ✅ Testes unitários

#### 2. PatientJourney Aggregate (Básico)

- ✅ Comandos:
  - `StartJourney`
  - `AdvanceStage`
  - `DetectRisk` (placeholder)
- ✅ Eventos gerados:
  - `JourneyStarted`
  - `JourneyStageChanged`
  - `RiskDetected`
- ✅ Estados iniciais (5 principais)
- ✅ Testes unitários

#### 3. State Machine Engine (MVP)

- ✅ Classe `StateMachine`
- ✅ Definição de transições (3-5 principais)
  - `first_contact → scheduled`
  - `scheduled → confirmed`
  - `confirmed → attended`
- ✅ Guards básicos
- ✅ Actions vazias (placeholder)

#### 4. API Endpoints

- ✅ `POST /appointments`
- ✅ `PUT /appointments/:id/confirm`
- ✅ `PUT /appointments/:id/cancel`
- ✅ Validações de conflito

### Definition of Done

- [ ] Agendamento manual via API funciona
- [ ] Validação de conflitos implementada
- [ ] Journey avança automaticamente ao agendar
- [ ] State machine processa eventos
- [ ] Testes de integração passando
- [ ] Postman collection atualizada

---

## Sprint 5: Projections + Dashboard (Semanas 9-10)

### Objetivo

Criar Read Models para queries rápidas e dashboard básico.

### Entregas

#### 1. Projections (Views)

- ✅ Schema das views:
  - `patients_view`
  - `conversations_view`
  - `appointments_view`
  - `journey_view`
- ✅ Migrations para criar views
- ✅ Índices estratégicos

#### 2. Event Handlers (Projections)

- ✅ Event Subscribers:
  - `PatientViewHandler`
  - `ConversationViewHandler`
  - `AppointmentViewHandler`
  - `JourneyViewHandler`
- ✅ Atualizar views em resposta a eventos
- ✅ Tratamento de erros
- ✅ Idempotência

#### 3. Repositories (Read Models)

- ✅ `PatientViewRepository`
- ✅ `ConversationViewRepository`
- ✅ `AppointmentViewRepository`
- ✅ `JourneyViewRepository`
- ✅ Queries comuns implementadas

#### 4. API Endpoints (Read)

- ✅ `GET /patients`
- ✅ `GET /patients/:id`
- ✅ `GET /patients/:id/timeline`
- ✅ `GET /conversations`
- ✅ `GET /conversations/:id`
- ✅ `GET /appointments`

#### 5. Dashboard Básico

- ✅ `GET /dashboard/overview`
- ✅ `GET /dashboard/risk` (placeholder)
- ✅ Métricas agregadas

### Definition of Done

- [ ] Eventos atualizam projections corretamente
- [ ] Queries retornam dados rapidamente (<100ms)
- [ ] Endpoints de leitura funcionam
- [ ] Dashboard exibe métricas corretas
- [ ] Testes de integração passando
- [ ] Lag de projections < 1s

---

## Sprint 6: Decision Engine + Actions (Semanas 11-12)

### Objetivo

Integrar LangChain para detecção de intenção e orquestração de ações.

### Entregas

#### 1. LangChain Integration

- ✅ Setup básico do LangChain
- ✅ Integration com OpenAI
- ✅ Configuração de prompts

#### 2. Intent Detection

- ✅ Service `IntentDetectionService`
- ✅ Intents suportados:
  - `schedule_appointment`
  - `cancel_appointment`
  - `reschedule_appointment`
  - `general_inquiry`
  - `request_human_agent`
- ✅ Extração de dados (data preferida, horário)
- ✅ Confidence scoring

#### 3. Decision Engine

- ✅ Service `DecisionEngineService`
- ✅ Lógica de decisão:
  - Alta confiança → Bot responde
  - Baixa confiança → Escala humano
  - Reclamação → Escala imediato
- ✅ Integração com Conversation aggregate

#### 4. Action Orchestrator

- ✅ Service `ActionOrchestratorService`
- ✅ Ações disponíveis:
  - `SendMessage` (WhatsApp)
  - `ScheduleAppointment`
  - `EscalateConversation`
  - `CreateAlert`
- ✅ Jobs assíncronos para ações

#### 5. Escalação Humana

- ✅ `POST /conversations/:id/escalate`
- ✅ `POST /conversations/:id/assign`
- ✅ `POST /conversations/:id/messages`
- ✅ Notificação de escalação (placeholder)

#### 6. Fluxo End-to-End Completo

- ✅ Mensagem → Intent Detection
- ✅ Decision Engine decide
- ✅ Action Orchestrator executa
- ✅ Eventos gravados
- ✅ Projections atualizadas
- ✅ Dashboard reflete mudanças

### Definition of Done

- [ ] Bot detecta intenções corretamente (>80% acurácia)
- [ ] Agendamentos automáticos funcionam
- [ ] Escalação para humano funciona
- [ ] Fluxo completo testado end-to-end
- [ ] Testes de integração passando
- [ ] MVP demonstrável para stakeholders

---

## Pós-MVP (Sprints 7+)

### Sprint 7: Risk Intelligence

- [ ] Algoritmo de cálculo de risk score
- [ ] Detecção de padrões de abandono
- [ ] Jobs de background para análise
- [ ] Dashboard de risco completo

### Sprint 8: Automações

- [ ] Reminders automáticos
- [ ] Follow-up proativo
- [ ] Recuperação de pacientes em risco
- [ ] Templates de mensagens

### Sprint 9: Reporting

- [ ] Relatórios de retenção
- [ ] Analytics de jornada
- [ ] Export de dados
- [ ] Visualizações

### Sprint 10: Polimento

- [ ] Frontend dashboard (React)
- [ ] Melhorias de UX
- [ ] Testes de carga
- [ ] Documentação completa

---

## Checklist Pré-Produção

### Infraestrutura

- [ ] CI/CD configurado (GitHub Actions)
- [ ] Deploy em staging (AWS ECS ou similar)
- [ ] Monitoring (Sentry + DataDog)
- [ ] Logs centralizados
- [ ] Backups automáticos

### Segurança

- [ ] RLS policies ativas
- [ ] Secrets em vault (não em .env)
- [ ] HTTPS obrigatório
- [ ] Rate limiting global
- [ ] Input validation completa

### Performance

- [ ] Índices otimizados
- [ ] Queries analisadas (EXPLAIN)
- [ ] Connection pooling configurado
- [ ] Caching (Redis) implementado
- [ ] Testes de carga (>100 req/s)

### Qualidade

- [ ] Cobertura de testes >70%
- [ ] Zero erros no linter
- [ ] Documentação de API completa
- [ ] Healthcheck endpoints

---

## Métricas de Sucesso (MVP)

### Técnicas

- Uptime >99%
- API response time <200ms (p95)
- Event processing lag <1s
- Zero data loss

### Produto

- Bot responde corretamente >80% das vezes
- Agendamentos automáticos >50% do total
- Escalação para humano <20% das conversas
- Pacientes em risco detectados com 14 dias de antecedência

---

## Dependências Externas

### Requeridas para MVP

- ✅ Auth0 ou Clerk (autenticação)
- ✅ Evolution API (WhatsApp)
- ✅ OpenAI API (LangChain)
- ✅ PostgreSQL 15+
- ✅ Redis 7+

### Opcionais (pós-MVP)

- Sentry (error tracking)
- DataDog (monitoring)
- SendGrid (email notifications)
- AWS S3 (file storage)

---

## Riscos e Mitigações

### Risco 1: Integração WhatsApp Instável

**Mitigação:**

- Retry logic robusto
- Fallback para notificações internas
- Testes com Evolution API desde Sprint 2

### Risco 2: LangChain Performance

**Mitigação:**

- Caching de intents comuns
- Timeout curto (5s)
- Fallback para regras simples

### Risco 3: Scope Creep

**Mitigação:**

- Definition of Done rígida
- Priorizar MVP sobre features
- Backlog claro de pós-MVP

### Risco 4: Complexidade de Event Sourcing

**Mitigação:**

- Documentação detalhada
- Code reviews frequentes
- Testes abrangentes

---

## Notas de Implementação

### Prioridades

1. **Estabilidade** > Features
2. **Testabilidade** > Velocidade
3. **Documentação** > Código clever

### Code Review

- Mandatory para todo PR
- Checklist de segurança
- Performance review para queries

### Git Workflow

- Feature branches
- Squash merge para main
- Semantic versioning
- Changelog atualizado

---

## Documentação Relacionada

- [DRIZZLE_SCHEMA.md](./DRIZZLE_SCHEMA.md) - Modelagem de dados
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Autenticação
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Endpoints
- [../ARCHITECTURE.md](../ARCHITECTURE.md) - Arquitetura geral
- [../EVENTS.md](../EVENTS.md) - Catálogo de eventos

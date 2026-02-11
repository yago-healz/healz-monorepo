# Plano 014: Event Sourcing Core - Healz

## Visao Geral

Este plano documenta a implementacao completa do core da Healz baseado em **Event Sourcing**, que permitira rastrear toda a jornada do paciente atraves de eventos imutaveis.

## Contexto

O core da Healz e fundamentado em 5 conceitos principais:

1. **Evento** - Fatos imutaveis que aconteceram
2. **Correlacao** - Como eventos se relacionam
3. **Operacao** - Conjunto de eventos que formam uma acao completa
4. **Agregado** - Onde as regras de negocio vivem
5. **Jornada** - Caminho do paciente ao longo do tempo

Para documentacao conceitual detalhada, consulte: `docs/CORE_CONCEPTS.md`

## Decisoes Arquiteturais

### Stack do Projeto (existente)

- **Backend:** NestJS 10 + TypeScript 5
- **ORM:** Drizzle ORM 0.45 (schemas em `src/db/schema/`, migrations via drizzle-kit)
- **Database:** PostgreSQL 16 (via `pg` pool)
- **Testes:** Jest 29 + Supertest 7
- **Infra:** Docker Compose (PostgreSQL + Redis)

### Event Bus: RabbitMQ

**Escolha:** RabbitMQ via CloudAMQP (free tier para MVP)

**Justificativa:**
- Durabilidade (eventos sao persistidos)
- Garantias de entrega (at-least-once)
- Retry nativo via Dead Letter Exchange
- Escalabilidade horizontal
- Custo zero inicialmente (1M mensagens/mes gratis)
- Observabilidade (Management UI)

**Dependencias a instalar:**
- `amqplib` - Cliente AMQP para Node.js
- `amqp-connection-manager` - Reconnect automatico

### Event Store: PostgreSQL + Drizzle

O Event Store usa a mesma infra existente:
- Schema Drizzle em `src/db/schema/events.schema.ts`
- Migrations via `drizzle-kit`
- Queries via Drizzle query builder
- Pool compartilhado com o resto da aplicacao

### Agregados do Sistema

O Healz possui 4 agregados principais:

1. **Patient** - Identidade e cadastro
2. **Conversation** - Comunicacao via WhatsApp
3. **Appointment** - Agendamentos e consultas
4. **PatientJourney** - Jornada e risco do paciente

## Estrutura do Plano

O desenvolvimento esta dividido em 9 fases sequenciais:

### Fase 1: Event Store Foundation
**Arquivo:** `01-event-store-foundation.md`

Implementacao da infraestrutura base de eventos:
- Schema Drizzle para tabela `events`
- EventStore service (queries Drizzle)
- Event Bus com RabbitMQ
- Tipos base (DomainEvent, AggregateRoot)

**Status:** Base de tudo - obrigatorio primeiro

---

### Fase 2: Patient Aggregate
**Arquivo:** `02-patient-aggregate.md`

Primeiro agregado completo como proof of concept:
- Agregado Patient
- Eventos: PatientRegistered, PatientUpdated
- Projection patient_view (schema Drizzle)
- API REST temporaria para testes

**Pode paralelizar com:** Fase 3

---

### Fase 3: WhatsApp Mock
**Arquivo:** `03-whatsapp-mock.md`

Gateway simulado de WhatsApp para testes:
- Endpoint de teste para simular mensagens
- Interface IMessagingGateway
- Implementacao mock

**Pode paralelizar com:** Fase 2

---

### Fase 4: Conversation Aggregate
**Arquivo:** `04-conversation-aggregate.md`

Implementacao de conversas e mensagens:
- Agregado Conversation
- Eventos: MessageReceived, MessageSent, IntentDetected
- Projection conversation_view (schema Drizzle)
- API REST temporaria

**Pode paralelizar com:** Fase 5

---

### Fase 5: Carol Mock
**Arquivo:** `05-carol-mock.md`

IA simulada para deteccao de intencoes:
- Interface IIntentDetector
- Implementacao mock com regex/keywords
- Mapeamento de intencoes basicas

**Pode paralelizar com:** Fase 4

---

### Fase 6: Appointment Aggregate
**Arquivo:** `06-appointment-aggregate.md`

Sistema de agendamentos:
- Agregado Appointment
- Eventos: AppointmentScheduled, AppointmentConfirmed, AppointmentCancelled
- Projection appointment_view (schema Drizzle)
- API REST

**Depende de:** Fases 2, 4

---

### Fase 7: PatientJourney Aggregate
**Arquivo:** `07-patient-journey-aggregate.md`

Jornada e sistema de risco:
- Agregado PatientJourney
- State machine (estagios da jornada)
- Calculo de risk score
- Eventos: JourneyStageChanged, RiskDetected, RiskScoreRecalculated
- Projection patient_journey_view (schema Drizzle)

**Depende de:** Fases 2, 4, 6

---

### Fase 8: WhatsApp Integration
**Arquivo:** `08-whatsapp-integration.md`

Integracao real com WhatsApp Business API:
- Webhook para receber mensagens
- API para enviar mensagens
- Substituicao do mock gateway

**Pode paralelizar com:** Fase 9

---

### Fase 9: Carol Integration
**Arquivo:** `09-carol-integration.md`

IA real para processamento de linguagem natural:
- Integracao com OpenAI/Claude
- Deteccao de intencao real
- Extracao de entidades
- Geracao de respostas contextuais
- Substituicao do mock detector

**Pode paralelizar com:** Fase 8

---

## Ordem de Execucao Recomendada

```
BLOQUEANTE (executar primeiro)
+-- Fase 1: Event Store Foundation

PARALELO (podem ser executadas juntas)
+-- Fase 2: Patient Aggregate
+-- Fase 3: WhatsApp Mock

PARALELO (podem ser executadas juntas)
+-- Fase 4: Conversation Aggregate
+-- Fase 5: Carol Mock

SEQUENCIAL (dependem das anteriores)
+-- Fase 6: Appointment Aggregate

BLOQUEANTE (depende de todas anteriores)
+-- Fase 7: PatientJourney Aggregate

PARALELO FINAL (integracoes reais)
+-- Fase 8: WhatsApp Integration
+-- Fase 9: Carol Integration
```

## Padrao Unificado de Eventos

Todas as fases seguem o MESMO padrao:

```typescript
// Interface base - TODOS os eventos implementam isso
interface DomainEvent<T = any> {
  event_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  aggregate_version: number;
  tenant_id: string;
  clinic_id?: string;
  correlation_id: string;
  causation_id?: string;
  user_id?: string;
  created_at: Date;
  event_data: T;
  metadata?: Record<string, any>;
}

// Base class - TODOS os agregados estendem isso
abstract class AggregateRoot {
  protected id: string;
  protected version: number = 0;
  protected uncommittedEvents: DomainEvent[] = [];

  protected abstract applyEvent(event: DomainEvent): void;
  protected addEvent(event: DomainEvent): void;
  public loadFromHistory(events: DomainEvent[]): void;
  public getUncommittedEvents(): DomainEvent[];
  public clearUncommittedEvents(): void;
}
```

## Criterios de Conclusao

Cada fase so esta completa quando:

1. Codigo implementado conforme especificacao
2. Testes unitarios dos agregados
3. Testes de integracao (event store, projections)
4. Testes E2E do fluxo completo via API
5. Documentacao atualizada (se necessario)

## Tecnologias

- **Backend:** NestJS 10 + TypeScript 5
- **ORM:** Drizzle ORM 0.45
- **Database:** PostgreSQL 16 (Event Store + Projections)
- **Event Bus:** RabbitMQ (via CloudAMQP free tier)
- **Message Queue:** amqp-connection-manager + amqplib
- **Testing:** Jest 29 + Supertest 7
- **WhatsApp:** WhatsApp Business API (Fase 8)
- **IA:** OpenAI/Claude API (Fase 9)

## Referencias

- [CORE_CONCEPTS.md](../../CORE_CONCEPTS.md) - Conceitos fundamentais
- [EVENTS.md](../../EVENTS.md) - Catalogo de eventos (a criar)
- [AGGREGATES.md](../../AGGREGATES.md) - Detalhes dos agregados (a criar)
- [STATE_MACHINE.md](../../STATE_MACHINE.md) - Maquina de estados (a criar)

## Status

Em andamento - Fases 1, 2, 3, 4, 5 e 6 completas

- [x] Fase 1: Event Store Foundation ✅
- [x] Fase 2: Patient Aggregate ✅
- [x] Fase 3: WhatsApp Mock ✅
- [x] Fase 4: Conversation Aggregate ✅ (testes completos: 11/11 passando)
- [x] Fase 5: Carol Mock ✅ (testes completos: 41/41 passando - 19 MockIntentDetector + 22 MockResponseGenerator)
- [x] Fase 6: Appointment Aggregate ✅ (testes unitários: 20/20 passando)
- [x] Fase 7: PatientJourney Aggregate ✅ (testes unitários: 30/30 passando - 15 aggregate + 15 risk score)
- [ ] Fase 8: WhatsApp Integration
- [ ] Fase 9: Carol Integration

---

**Proximo passo:** Executar Fase 8 (WhatsApp Integration) ou Fase 9 (Carol Integration) - podem ser paralelas

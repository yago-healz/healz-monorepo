# Plano 014: Event Sourcing Core - Healz

## Visão Geral

Este plano documenta a implementação completa do core da Healz baseado em **Event Sourcing**, que permitirá rastrear toda a jornada do paciente através de eventos imutáveis.

## Contexto

O core da Healz é fundamentado em 5 conceitos principais:

1. **Evento** - Fatos imutáveis que aconteceram
2. **Correlação** - Como eventos se relacionam
3. **Operação** - Conjunto de eventos que formam uma ação completa
4. **Agregado** - Onde as regras de negócio vivem
5. **Jornada** - Caminho do paciente ao longo do tempo

Para documentação conceitual detalhada, consulte: `docs/CORE_CONCEPTS.md`

## Decisões Arquiteturais

### Event Bus: RabbitMQ

**Escolha:** RabbitMQ via CloudAMQP (free tier para MVP)

**Justificativa:**
- ✅ Durabilidade (eventos são persistidos)
- ✅ Garantias de entrega (at-least-once)
- ✅ Retry nativo via Dead Letter Exchange
- ✅ Escalabilidade horizontal
- ✅ Custo zero inicialmente (1M mensagens/mês grátis)
- ✅ Observabilidade (Management UI)

### Agregados do Sistema

O Healz possui 4 agregados principais:

1. **Patient** - Identidade e cadastro
2. **Conversation** - Comunicação via WhatsApp
3. **Appointment** - Agendamentos e consultas
4. **PatientJourney** - Jornada e risco do paciente

## Estrutura do Plano

O desenvolvimento está dividido em 9 fases sequenciais:

### Fase 1: Event Store Foundation
**Arquivo:** `01-event-store-foundation.md`

Implementação da infraestrutura base de eventos:
- Tabela `events` no PostgreSQL
- EventStore service
- Event Bus com RabbitMQ
- Tipos base (DomainEvent, AggregateRoot)

**Status:** Base de tudo - obrigatório primeiro

---

### Fase 2: Patient Aggregate
**Arquivo:** `02-patient-aggregate.md`

Primeiro agregado completo como proof of concept:
- Agregado Patient
- Eventos: PatientRegistered, PatientUpdated
- Projection patient_view
- API REST temporária para testes

**Pode paralelizar com:** Fase 3

---

### Fase 3: WhatsApp Mock
**Arquivo:** `03-whatsapp-mock.md`

Gateway simulado de WhatsApp para testes:
- Endpoint de teste para simular mensagens
- Interface IMessagingGateway
- Implementação mock

**Pode paralelizar com:** Fase 2

---

### Fase 4: Conversation Aggregate
**Arquivo:** `04-conversation-aggregate.md`

Implementação de conversas e mensagens:
- Agregado Conversation
- Eventos: MessageReceived, MessageSent, IntentDetected
- Projection conversation_view
- API REST temporária

**Pode paralelizar com:** Fase 5

---

### Fase 5: Carol Mock
**Arquivo:** `05-carol-mock.md`

IA simulada para detecção de intenções:
- Interface IIntentDetector
- Implementação mock com regex/keywords
- Mapeamento de intenções básicas

**Pode paralelizar com:** Fase 4

---

### Fase 6: Appointment Aggregate
**Arquivo:** `06-appointment-aggregate.md`

Sistema de agendamentos:
- Agregado Appointment
- Eventos: AppointmentScheduled, AppointmentConfirmed, AppointmentCancelled
- Projection appointment_view
- API REST

**Depende de:** Fases 2, 4

---

### Fase 7: PatientJourney Aggregate
**Arquivo:** `07-patient-journey-aggregate.md`

Jornada e sistema de risco:
- Agregado PatientJourney
- State machine (estágios da jornada)
- Cálculo de risk score
- Eventos: JourneyStageChanged, RiskDetected, RiskScoreRecalculated
- Projection patient_journey_view

**Depende de:** Fases 2, 4, 6

---

### Fase 8: WhatsApp Integration
**Arquivo:** `08-whatsapp-integration.md`

Integração real com WhatsApp Business API:
- Webhook para receber mensagens
- API para enviar mensagens
- Substituição do mock gateway

**Pode paralelizar com:** Fase 9

---

### Fase 9: Carol Integration
**Arquivo:** `09-carol-integration.md`

IA real para processamento de linguagem natural:
- Integração com OpenAI/Claude
- Detecção de intenção real
- Extração de entidades
- Geração de respostas contextuais
- Substituição do mock detector

**Pode paralelizar com:** Fase 8

---

## Ordem de Execução Recomendada

```
BLOQUEANTE (executar primeiro)
├─ Fase 1: Event Store Foundation

PARALELO (podem ser executadas juntas)
├─ Fase 2: Patient Aggregate
└─ Fase 3: WhatsApp Mock

PARALELO (podem ser executadas juntas)
├─ Fase 4: Conversation Aggregate
└─ Fase 5: Carol Mock

SEQUENCIAL (dependem das anteriores)
├─ Fase 6: Appointment Aggregate

BLOQUEANTE (depende de todas anteriores)
├─ Fase 7: PatientJourney Aggregate

PARALELO FINAL (integrações reais)
├─ Fase 8: WhatsApp Integration
└─ Fase 9: Carol Integration
```

## Critérios de Conclusão

Cada fase só está completa quando:

1. ✅ Código implementado conforme especificação
2. ✅ Testes unitários dos agregados
3. ✅ Testes de integração (event store, projections)
4. ✅ Testes E2E do fluxo completo via API
5. ✅ Documentação atualizada (se necessário)

## Tecnologias

- **Backend:** NestJS + TypeScript
- **Database:** PostgreSQL (Event Store + Projections)
- **Event Bus:** RabbitMQ (via CloudAMQP free tier)
- **Message Queue:** amqp-connection-manager + amqplib
- **Testing:** Jest + Supertest
- **WhatsApp:** WhatsApp Business API (Fase 8)
- **IA:** OpenAI/Claude API (Fase 9)

## Referências

- [CORE_CONCEPTS.md](../CORE_CONCEPTS.md) - Conceitos fundamentais
- [EVENTS.md](../EVENTS.md) - Catálogo de eventos (a criar)
- [AGGREGATES.md](../AGGREGATES.md) - Detalhes dos agregados (a criar)
- [STATE_MACHINE.md](../STATE_MACHINE.md) - Máquina de estados (a criar)

## Status

✅ **Planejamento 100% Completo** - Todas as 9 fases documentadas e prontas para execução

- ✅ Fase 1: Event Store Foundation
- ✅ Fase 2: Patient Aggregate
- ✅ Fase 3: WhatsApp Mock
- ✅ Fase 4: Conversation Aggregate
- ✅ Fase 5: Carol Mock
- ✅ Fase 6: Appointment Aggregate
- ✅ Fase 7: PatientJourney Aggregate
- ✅ Fase 8: WhatsApp Integration
- ✅ Fase 9: Carol Integration

---

**Próximo passo:** Executar Fase 1 (Event Store Foundation)

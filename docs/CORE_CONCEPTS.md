# Conceitos Fundamentais - Healz

## Visão Geral

Este documento explica os **conceitos principais da arquitetura do Healz** de forma didática, partindo do básico e construindo entendimento progressivamente.

**Público-alvo:** Desenvolvedores, arquitetos e qualquer pessoa que precise entender como o Healz funciona internamente.

Para documentação mais específica:
- [EVENTS.md](./EVENTS.md) - Catálogo completo de eventos
- [AGGREGATES.md](./AGGREGATES.md) - Detalhes sobre agregados
- [STATE_MACHINE.md](./STATE_MACHINE.md) - Máquina de estados da jornada

---

## Por que estes conceitos importam?

O Healz não é um CRUD tradicional. Ele precisa:

✅ **Rastrear tudo que acontece** - Cada mensagem, agendamento, confirmação
✅ **Reconstruir o passado** - "O que aconteceu com este paciente?"
✅ **Detectar padrões** - "Este paciente está em risco de abandono?"
✅ **Auditar completamente** - "Quem fez o quê e quando?" (LGPD)

Para isso, usamos **5 conceitos fundamentais**:

1. **Evento** - Fatos imutáveis que aconteceram
2. **Correlação** - Como eventos se relacionam
3. **Operação** - Conjunto de eventos que formam uma ação completa
4. **Agregado** - Onde as regras de negócio vivem
5. **Jornada** - Caminho do paciente ao longo do tempo

---

## 1️⃣ Evento

### O que é?

Um **evento** é um **fato imutável** que aconteceu no sistema.

```typescript
// Exemplo: Paciente enviou mensagem
{
  event_type: "MessageReceived",
  event_data: {
    conversation_id: "conv-123",
    content: "Oi, quero marcar consulta",
    timestamp: "2025-01-29T10:00:00Z"
  }
}
```

### Características

✅ **Imutável** - Uma vez gravado, nunca muda
✅ **Passado** - Sempre no passado ("MessageReceived", não "ReceiveMessage")
✅ **Completo** - Contém todos os dados necessários
✅ **Ordenado** - Cada evento tem timestamp e sequência

### Por que eventos?

**Problema tradicional (CRUD):**

```typescript
// Banco de dados tradicional - estado atual apenas
patients: {
  id: "patient-123",
  status: "inactive" // ❌ Não sabemos POR QUE está inativo
}
```

**Solução com eventos:**

```typescript
// Event Store - histórico completo
[
  { event_type: "PatientRegistered", data: {...}, created_at: "2025-01-15" },
  { event_type: "AppointmentScheduled", data: {...}, created_at: "2025-01-16" },
  { event_type: "AppointmentCancelled", data: {...}, created_at: "2025-01-18" },
  { event_type: "MessageReceived", data: {...}, created_at: "2025-01-19" },
  { event_type: "JourneyAbandoned", data: {...}, created_at: "2025-02-20" }
  // ✅ Sabemos EXATAMENTE o que aconteceu e quando
]
```

### Estrutura de um Evento

Todos os eventos no Healz seguem esta estrutura:

```typescript
{
  // === Identificação ===
  id: BIGSERIAL,                    // ID sequencial no banco
  event_id: UUID,                   // ID único global
  event_type: "PatientRegistered",  // Tipo do evento

  // === Agregado (quem gerou) ===
  aggregate_type: "Patient",        // Tipo do agregado
  aggregate_id: UUID,               // ID do agregado
  aggregate_version: 1,             // Versão (optimistic locking)

  // === Contexto Multi-tenant ===
  tenant_id: UUID,                  // Organização
  clinic_id: UUID | null,           // Clínica (opcional)

  // === Rastreabilidade ===
  causation_id: UUID | null,        // Evento que CAUSOU este
  correlation_id: UUID,             // Agrupa OPERAÇÃO completa
  user_id: UUID | null,             // Quem iniciou

  // === Timestamp ===
  created_at: DateTime,             // Quando aconteceu

  // === Dados específicos ===
  event_data: {
    // Varia por tipo de evento
    patient_id: UUID,
    phone: "+5511999999999",
    full_name: "Maria Silva",
    // ...
  },

  // === Metadados flexíveis ===
  metadata: {
    ip_address?: string,
    user_agent?: string,
    // ...
  }
}
```

### Exemplo Real: Agendamento de Consulta

```typescript
// Paciente envia mensagem pedindo consulta
{
  event_id: "evt-001",
  event_type: "MessageReceived",
  aggregate_type: "Conversation",
  aggregate_id: "conv-123",
  correlation_id: "flow-schedule-456",  // Marca início da operação
  event_data: {
    content: "Quero marcar consulta para amanhã",
    timestamp: "2025-01-29T10:00:00Z"
  }
}

// Sistema detecta intenção
{
  event_id: "evt-002",
  event_type: "IntentDetected",
  aggregate_type: "Conversation",
  aggregate_id: "conv-123",
  causation_id: "evt-001",              // Foi causado pela mensagem
  correlation_id: "flow-schedule-456",  // Mesma operação
  event_data: {
    intent: "schedule_appointment",
    confidence: 0.92
  }
}

// Consulta é agendada
{
  event_id: "evt-003",
  event_type: "AppointmentScheduled",
  aggregate_type: "Appointment",
  aggregate_id: "appt-789",
  causation_id: "evt-002",              // Foi causado pela detecção de intenção
  correlation_id: "flow-schedule-456",  // Mesma operação
  event_data: {
    patient_id: "patient-456",
    scheduled_for: "2025-01-30T14:00:00Z",
    doctor_id: "doctor-123"
  }
}
```

---

## 2️⃣ Correlação

### O que é?

**Correlação** é o mecanismo que **agrupa eventos relacionados** que fazem parte da mesma operação de negócio.

Usamos `correlation_id` para rastrear uma operação completa do início ao fim.

### Por que precisamos?

Imagine que um paciente envia uma mensagem pedindo para agendar consulta. Isso dispara:

1. `MessageReceived` - Mensagem chegou
2. `IntentDetected` - Sistema detectou intenção
3. `AppointmentScheduled` - Consulta foi agendada
4. `MessageSent` - Confirmação enviada
5. `JourneyStageChanged` - Jornada avançou

**Como saber que esses 5 eventos fazem parte da MESMA operação?**

👉 **Todos compartilham o mesmo `correlation_id`!**

### Diagrama de Correlação

```
correlation_id: "flow-schedule-001"
│
├─ MessageReceived (evt-001)
│     └─ causation_id: null
│
├─ IntentDetected (evt-002)
│     └─ causation_id: evt-001
│
├─ AppointmentScheduled (evt-003)
│     └─ causation_id: evt-002
│
├─ MessageSent (evt-004)
│     └─ causation_id: evt-003
│
└─ JourneyStageChanged (evt-005)
      └─ causation_id: evt-003
```

### Diferença: Causation vs Correlation

| Campo            | Significado                      | Exemplo                                    |
| ---------------- | -------------------------------- | ------------------------------------------ |
| `causation_id`   | Evento que **causou diretamente**| `IntentDetected` foi causado por `MessageReceived` |
| `correlation_id` | Operação completa (início ao fim)| Todos os eventos do agendamento            |

**Analogia:**

- `correlation_id` = Pedido no restaurante
- `causation_id` = Cada prato depende do anterior (entrada → prato principal → sobremesa)

### Exemplo de Query

```sql
-- Buscar TODA a operação de agendamento
SELECT *
FROM events
WHERE correlation_id = 'flow-schedule-001'
ORDER BY created_at ASC;

-- Resultado: Todos os 5 eventos relacionados
```

### Casos de Uso

#### 1. Debugging

```typescript
// Algo deu errado no agendamento. Vamos rastrear!
const events = await eventStore.getByCorrelationId("flow-schedule-001");

console.log("Fluxo completo:");
events.forEach(e => {
  console.log(`${e.event_type} → ${e.event_data}`);
});

// Output:
// MessageReceived → "Quero marcar consulta"
// IntentDetected → intent: schedule_appointment
// AppointmentScheduled → scheduled_for: 2025-01-30T14:00:00Z
// ❌ MessageSent → ERROR: WhatsApp API timeout
// → AHA! Consulta foi agendada mas confirmação não foi enviada
```

#### 2. Auditoria (LGPD)

```typescript
// Paciente pergunta: "Quem agendou minha consulta?"
const events = await eventStore.getByCorrelationId(correlationId);

const initiator = events[0]; // Primeiro evento
console.log(`Iniciado por: ${initiator.user_id || 'Sistema automático'}`);
console.log(`IP: ${initiator.metadata.ip_address}`);
console.log(`Timestamp: ${initiator.created_at}`);
```

#### 3. Métricas de Operação

```typescript
// Tempo médio de uma operação de agendamento
SELECT
  correlation_id,
  MIN(created_at) as started_at,
  MAX(created_at) as completed_at,
  MAX(created_at) - MIN(created_at) as duration
FROM events
WHERE correlation_id LIKE 'flow-schedule-%'
GROUP BY correlation_id;

// Média: 2.3 segundos por operação completa
```

---

## 3️⃣ Operação

### O que é?

Uma **operação** é um **conjunto de eventos correlacionados** que representam uma ação de negócio completa.

**Operação ≠ Evento**

- 1 Evento = 1 fato atômico
- 1 Operação = N eventos relacionados

### Características

✅ **Início claro** - Primeiro evento com novo `correlation_id`
✅ **Fim identificável** - Último evento da cadeia
✅ **Atômica logicamente** - Ou completa com sucesso ou falha
✅ **Rastreável** - Via `correlation_id`

### Tipos de Operações no Healz

| Operação                    | Eventos Envolvidos                                                    | Duração típica |
| --------------------------- | --------------------------------------------------------------------- | -------------- |
| **Agendamento de consulta** | MessageReceived → IntentDetected → AppointmentScheduled → MessageSent | 1-3 segundos   |
| **Confirmação de consulta** | MessageReceived → AppointmentConfirmed → MessageSent                  | 0.5-1 segundo  |
| **Detecção de risco**       | RiskDetected → RiskScoreRecalculated → RiskEscalated → AlertSent      | 5-10 segundos  |
| **Recuperação de paciente** | MessageReceived → JourneyRecovered → RiskScoreRecalculated            | 2-4 segundos   |

### Exemplo Completo: Operação de Agendamento

```typescript
// === OPERAÇÃO: Agendamento de Consulta ===
// correlation_id: "flow-schedule-abc123"

// 1️⃣ INÍCIO - Paciente envia mensagem
{
  event_id: "msg-001",
  event_type: "MessageReceived",
  aggregate_type: "Conversation",
  aggregate_id: "conv-456",
  correlation_id: "flow-schedule-abc123",  // 🎯 Novo correlation_id
  causation_id: null,                      // Início da cadeia
  user_id: null,                           // Iniciado pelo paciente
  event_data: {
    content: "Oi, quero agendar consulta para próxima terça",
    timestamp: "2025-01-29T10:00:00.000Z"
  }
}

// 2️⃣ Sistema processa
{
  event_id: "intent-001",
  event_type: "IntentDetected",
  aggregate_type: "Conversation",
  aggregate_id: "conv-456",
  correlation_id: "flow-schedule-abc123",  // Mesma operação
  causation_id: "msg-001",                 // Causado pela mensagem
  event_data: {
    intent: "schedule_appointment",
    confidence: 0.94,
    extracted_data: {
      preferred_date: "2025-02-04"
    }
  }
}

// 3️⃣ Consulta é agendada
{
  event_id: "appt-001",
  event_type: "AppointmentScheduled",
  aggregate_type: "Appointment",
  aggregate_id: "appt-789",              // Novo agregado criado
  correlation_id: "flow-schedule-abc123",
  causation_id: "intent-001",
  event_data: {
    patient_id: "patient-456",
    clinic_id: "clinic-123",
    doctor_id: "doctor-789",
    scheduled_for: "2025-02-04T14:00:00Z",
    duration: 30
  }
}

// 4️⃣ Confirmação enviada
{
  event_id: "msg-002",
  event_type: "MessageSent",
  aggregate_type: "Conversation",
  aggregate_id: "conv-456",
  correlation_id: "flow-schedule-abc123",
  causation_id: "appt-001",
  event_data: {
    content: "✅ Consulta agendada para 04/02 às 14h com Dr. João!",
    sender: "bot"
  }
}

// 5️⃣ FIM - Jornada atualizada
{
  event_id: "journey-001",
  event_type: "JourneyStageChanged",
  aggregate_type: "PatientJourney",
  aggregate_id: "journey-999",
  correlation_id: "flow-schedule-abc123",  // Mesma operação
  causation_id: "appt-001",
  event_data: {
    previous_stage: "first_contact",
    new_stage: "scheduled",
    reason: "Appointment created"
  }
}
```

### Operação vs Transação

**Importante:** Operação ≠ Transação de banco

```typescript
// ❌ NÃO fazemos assim (transação única)
await db.transaction(async (tx) => {
  await tx.insert(appointments).values(...);
  await tx.insert(messages).values(...);
  await tx.update(journeys).set(...);
});

// ✅ Fazemos assim (eventos sequenciais)
await eventStore.append(MessageReceived);
await eventStore.append(IntentDetected);
await eventStore.append(AppointmentScheduled);
// Cada evento é uma transação separada
// Mas todos compartilham correlation_id
```

**Por quê?**

- Eventos podem ser processados assincronamente
- Falha em um evento não desfaz os anteriores (event sourcing)
- Permite processamento distribuído
- Facilita retry e idempotência

### Gerando correlation_id

```typescript
// Estratégias comuns

// 1. UUID v4 (simples)
const correlationId = crypto.randomUUID();

// 2. Prefixo + UUID (facilita debug)
const correlationId = `flow-schedule-${crypto.randomUUID()}`;

// 3. Timestamp + UUID (ordenável)
const correlationId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

// 4. Propagação (se já existe)
const correlationId = incomingEvent.correlation_id || crypto.randomUUID();
```

---

## 4️⃣ Agregado

### O que é?

Um **agregado** é uma **entidade de domínio** que:

✅ Garante **regras de negócio**
✅ Gera **eventos** quando seu estado muda
✅ É **reconstruído** a partir do histórico de eventos

**Analogia:** Agregado é como um "guardião" que protege a consistência de uma parte do sistema.

### Os 4 Agregados do Healz

```
┌─────────────┐
│   Patient   │ - Identidade e cadastro
└─────────────┘

┌──────────────┐
│ Conversation │ - Comunicação via WhatsApp
└──────────────┘

┌─────────────┐
│ Appointment │ - Agendamentos e consultas
└─────────────┘

┌────────────────┐
│ PatientJourney │ - Jornada e risco do paciente
└────────────────┘
```

### Exemplo: Agregado Appointment

```typescript
class Appointment {
  // === Estado interno ===
  private id: UUID;
  private patientId: UUID;
  private clinicId: UUID;
  private doctorId: UUID;
  private scheduledFor: DateTime;
  private status: 'scheduled' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';

  // === Eventos não commitados ===
  private uncommittedEvents: DomainEvent[] = [];

  // === Regra de negócio: Confirmar consulta ===
  confirm(confirmedBy: 'patient' | 'agent', method: string) {
    // Validação 1: Só pode confirmar se status permitir
    if (this.status !== 'scheduled' && this.status !== 'confirmed') {
      throw new Error('Cannot confirm appointment in status: ' + this.status);
    }

    // Validação 2: Não pode confirmar consulta no passado
    if (this.scheduledFor < new Date()) {
      throw new Error('Cannot confirm past appointment');
    }

    // ✅ Regras passaram - Gerar evento
    const event = new AppointmentConfirmed({
      appointment_id: this.id,
      confirmed_by: confirmedBy,
      confirmation_method: method,
      confirmed_at: new Date()
    });

    // Aplicar mudança
    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  // === Aplicar evento ao estado ===
  private apply(event: DomainEvent) {
    switch (event.event_type) {
      case 'AppointmentConfirmed':
        this.status = 'confirmed';
        break;
      case 'AppointmentCancelled':
        this.status = 'cancelled';
        break;
      // ... outros eventos
    }
  }

  // === Reconstruir a partir de eventos ===
  static fromHistory(events: DomainEvent[]): Appointment {
    const appointment = new Appointment();

    for (const event of events) {
      appointment.apply(event);
    }

    return appointment;
  }
}
```

### Como Agregados Funcionam

```typescript
// 1️⃣ Carregar agregado do Event Store
const events = await eventStore.getByAggregateId('appt-789');
const appointment = Appointment.fromHistory(events);

// 2️⃣ Executar comando (aplica regras de negócio)
appointment.confirm('patient', 'whatsapp');
// → Se regras falharem: Exception é lançada
// → Se passarem: Evento é gerado

// 3️⃣ Salvar novos eventos
await eventStore.append(appointment.uncommittedEvents);

// 4️⃣ Publicar eventos no event bus
await eventBus.publishAll(appointment.uncommittedEvents);
```

### Invariantes (Regras de Negócio)

Cada agregado **garante suas próprias regras**:

#### Patient
- ✅ Telefone único por organização
- ✅ Status válido (active, inactive, suspended)
- ✅ Transições de status permitidas

#### Appointment
- ✅ Sem conflitos de horário (mesmo médico, mesmo horário)
- ✅ Não pode agendar no passado
- ✅ Não pode agendar fora do horário de funcionamento

#### Conversation
- ✅ Bot não envia mais de 3 mensagens consecutivas
- ✅ Conversa escalada não volta para bot automaticamente

#### PatientJourney
- ✅ Risk score entre 0.0 e 1.0
- ✅ Uma jornada ativa por paciente/clínica
- ✅ Transições de estágio válidas

### Agregados vs Entidades vs Value Objects

```typescript
// Agregado (tem identidade, gera eventos)
class Appointment {
  id: UUID;
  // ... gera AppointmentScheduled, AppointmentConfirmed, etc
}

// Entidade (tem identidade, mas vive dentro do agregado)
class Message {
  id: UUID;
  conversationId: UUID; // Pertence a Conversation
  // Não gera eventos diretamente
}

// Value Object (sem identidade, imutável)
class Address {
  street: string;
  city: string;
  zipCode: string;
  // Não tem ID, é apenas um valor
}
```

---

## 5️⃣ Jornada

### O que é?

A **jornada** é o **caminho do paciente ao longo do tempo** dentro de uma clínica, desde o primeiro contato até a conclusão do tratamento.

**Diferença chave:**
- `Patient` = Identidade (cadastro, dados pessoais)
- `PatientJourney` = Processo (estágios, risco, interações)

### Estados da Jornada

```
                    ┌──────────────┐
                    │  INITIATED   │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │ FIRST_CONTACT│
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │  SCHEDULED   │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │  CONFIRMED   │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │   ATTENDED   │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │  FOLLOW_UP   │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │   RETURNED   │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │  COMPLETED   │
                    └──────────────┘

         ⚠️ Em qualquer momento pode ir para:

                    ┌──────────────┐
                    │   AT_RISK    │ ⚠️
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │  ABANDONED   │ ❌
                    └──────────────┘
```

### Como a Jornada Progride

**A jornada progride AUTOMATICAMENTE via eventos:**

```typescript
// Paciente envia primeira mensagem
→ ConversationStarted
→ JourneyStageChanged: initiated → first_contact

// Consulta é agendada
→ AppointmentScheduled
→ JourneyStageChanged: first_contact → scheduled

// Paciente confirma
→ AppointmentConfirmed
→ JourneyStageChanged: scheduled → confirmed

// Consulta é realizada
→ AppointmentCompleted
→ JourneyStageChanged: confirmed → attended

// Sistema detecta necessidade de retorno
→ JourneyStageChanged: attended → follow_up

// Paciente agenda nova consulta
→ AppointmentScheduled
→ JourneyStageChanged: follow_up → returned
```

### Detecção de Risco

A jornada monitora **sinais de abandono**:

| Sinal           | Peso | Threshold            | Ação                    |
| --------------- | ---- | -------------------- | ----------------------- |
| Silêncio        | 0.4  | 14+ dias sem resposta| Detectar risco          |
| No-show         | 0.3  | 1 falta              | Score +0.3              |
| No-show         | 0.3  | 2+ faltas            | Escalar                 |
| Cancelamento    | 0.2  | 2+ cancelamentos     | Detectar risco          |
| Tom negativo    | 0.1  | Sentiment < 0.3      | Score +0.1              |

**Cálculo do Risk Score:**

```typescript
function calculateRiskScore(journey: PatientJourney): number {
  const indicators = journey.riskIndicators;

  let totalScore = 0;
  let totalWeight = 0;

  for (const indicator of indicators) {
    const weight = RISK_WEIGHTS[indicator.type];
    totalScore += indicator.value * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

// Exemplo:
// Indicadores:
// - silence: value=0.8, weight=0.4 → 0.32
// - no_show: value=0.9, weight=0.3 → 0.27
// Total: 0.59 / 0.7 = 0.84 ⚠️ ALTO RISCO
```

### Exemplo Real: Jornada Completa

```typescript
// === DIA 1: Primeiro contato ===
{
  event_type: "ConversationStarted",
  data: { patient_id: "patient-123" }
}
→ JourneyStageChanged: null → first_contact

// === DIA 2: Agendamento ===
{
  event_type: "AppointmentScheduled",
  data: { scheduled_for: "2025-02-15T14:00:00Z" }
}
→ JourneyStageChanged: first_contact → scheduled

// === DIA 14: Confirmação ===
{
  event_type: "AppointmentConfirmed"
}
→ JourneyStageChanged: scheduled → confirmed

// === DIA 15: Consulta realizada ===
{
  event_type: "AppointmentCompleted",
  data: { notes: "Retorno em 30 dias" }
}
→ JourneyStageChanged: confirmed → attended
→ JourneyStageChanged: attended → follow_up

// === DIA 45: Sistema detecta silêncio ===
→ RiskDetected: { type: "silence", value: 0.8 }
→ RiskScoreRecalculated: { new_score: 0.8 }
→ JourneyStageChanged: follow_up → at_risk
→ AlertSent: { message: "Paciente em risco alto" }

// === DIA 50: Paciente retorna contato ===
{
  event_type: "MessageReceived",
  data: { content: "Oi, quero agendar retorno" }
}
→ JourneyRecovered
→ RiskScoreRecalculated: { new_score: 0.2 }
→ JourneyStageChanged: at_risk → recovered

// === DIA 51: Novo agendamento ===
{
  event_type: "AppointmentScheduled"
}
→ JourneyStageChanged: recovered → scheduled
```

---

## 🔗 Como Tudo se Conecta

### Fluxo Completo: Mensagem → Agendamento

```
1️⃣ EVENTO INICIAL
   MessageReceived
   ↓ correlation_id: "flow-001"

2️⃣ AGREGADO PROCESSA
   Conversation.receiveMessage()
   → Valida regras
   → Gera IntentDetected

3️⃣ CORRELAÇÃO
   Todos eventos com correlation_id = "flow-001"

4️⃣ OPERAÇÃO
   flow-001 agrupa:
   - MessageReceived
   - IntentDetected
   - AppointmentScheduled
   - MessageSent
   - JourneyStageChanged

5️⃣ JORNADA ATUALIZADA
   PatientJourney.advanceStage('scheduled')
   → Gera JourneyStageChanged
```

### Event Store → Read Models

```
┌──────────────────┐
│   EVENT STORE    │ ← Fonte da verdade
│  (Write Model)   │
└────────┬─────────┘
         │
         │ eventos publicados
         ↓
┌──────────────────┐
│    EVENT BUS     │
└────────┬─────────┘
         │
         ├─→ Projection 1 (PatientView)
         ├─→ Projection 2 (AppointmentView)
         ├─→ Projection 3 (JourneyView)
         └─→ Projection 4 (RiskDashboard)
              ↓
       ┌──────────────┐
       │ READ MODELS  │ ← Otimizado para queries
       │ (PostgreSQL) │
       └──────────────┘
```

### Visão Completa

```typescript
// === COMANDO ===
const command = new ScheduleAppointment({
  patient_id: "patient-123",
  scheduled_for: "2025-02-15T14:00:00Z"
});

// === AGREGADO ===
const appointment = new Appointment();
appointment.schedule(command);
// → Valida regras de negócio
// → Gera AppointmentScheduled

// === EVENTO ===
const event = {
  event_id: crypto.randomUUID(),
  event_type: "AppointmentScheduled",
  aggregate_type: "Appointment",
  aggregate_id: appointment.id,
  correlation_id: "flow-schedule-001", // 🎯 Operação
  causation_id: previousEventId,
  event_data: { ... }
};

// === EVENT STORE ===
await eventStore.append(event);

// === EVENT BUS ===
await eventBus.publish(event);

// === PROJECTIONS ===
// AppointmentView atualizada
// JourneyView atualizada
// Analytics recalculados

// === JORNADA ===
const journey = PatientJourney.fromHistory(events);
await journey.advanceStage('scheduled');
```

---

## 📊 Comparação: CRUD vs Event Sourcing

### CRUD Tradicional

```typescript
// ❌ Estado atual apenas
appointments: {
  id: "appt-123",
  status: "cancelled", // Perdemos o histórico!
  updated_at: "2025-01-29"
}

// Perguntas impossíveis de responder:
// - Quantas vezes foi remarcado?
// - Quem cancelou?
// - Por que foi cancelado?
// - Quando foi agendado originalmente?
```

### Event Sourcing (Healz)

```typescript
// ✅ Histórico completo
events: [
  { event_type: "AppointmentScheduled", data: {...}, created_at: "2025-01-15" },
  { event_type: "AppointmentRescheduled", data: {...}, created_at: "2025-01-18" },
  { event_type: "AppointmentRescheduled", data: {...}, created_at: "2025-01-20" },
  { event_type: "AppointmentCancelled", data: {
      reason: "Patient moved to another city",
      cancelled_by: "patient"
    }, created_at: "2025-01-25"
  }
]

// Todas as perguntas são respondíveis:
// - Remarcado 2 vezes ✅
// - Cancelado pelo paciente ✅
// - Motivo: mudou de cidade ✅
// - Agendado originalmente em 15/01 ✅
```

---

## ✅ Checklist de Entendimento

Você entendeu se conseguir responder:

### Sobre Eventos
- [ ] O que é um evento?
- [ ] Por que eventos são imutáveis?
- [ ] Qual a diferença entre `event_type` e `aggregate_type`?
- [ ] Para que serve `aggregate_version`?

### Sobre Correlação
- [ ] Qual a diferença entre `causation_id` e `correlation_id`?
- [ ] Como rastrear uma operação completa?
- [ ] Por que precisamos de correlação?

### Sobre Operação
- [ ] O que é uma operação?
- [ ] Qual a diferença entre operação e transação?
- [ ] Como identificar início e fim de uma operação?

### Sobre Agregados
- [ ] O que é um agregado?
- [ ] Quais os 4 agregados do Healz?
- [ ] Como agregados garantem regras de negócio?
- [ ] Como reconstruir um agregado a partir de eventos?

### Sobre Jornada
- [ ] Qual a diferença entre Patient e PatientJourney?
- [ ] Como a jornada progride?
- [ ] O que é risk score?
- [ ] Quais os principais estados da jornada?

---

## 🎯 Próximos Passos

Agora que você entende os conceitos fundamentais:

1. **Aprofunde em Eventos** → [EVENTS.md](./EVENTS.md)
2. **Entenda Agregados** → [AGGREGATES.md](./AGGREGATES.md)
3. **Explore a Máquina de Estados** → [STATE_MACHINE.md](./STATE_MACHINE.md)
4. **Veja as Projections** → [PROJECTIONS.md](./PROJECTIONS.md)
5. **Arquitetura Completa** → [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📚 Documentação Relacionada

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura geral do sistema
- [EVENTS.md](./EVENTS.md) - Catálogo completo de 30 tipos de eventos
- [AGGREGATES.md](./AGGREGATES.md) - Detalhes dos 4 agregados
- [STATE_MACHINE.md](./STATE_MACHINE.md) - Máquina de estados da jornada
- [PROJECTIONS.md](./PROJECTIONS.md) - Read Models e sincronização
- [DATABASE.md](./DATABASE.md) - Event Store e schema

---

## Status

✅ **Completo** - Documento criado em 2025-01-29

Cobre os 5 conceitos fundamentais da arquitetura do Healz de forma didática e progressiva.

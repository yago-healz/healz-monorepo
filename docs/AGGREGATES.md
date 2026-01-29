# Agregados - Healz

## Visão Geral

O Healz é organizado em **4 agregados principais** que representam os conceitos centrais do domínio:

1. **Patient** - Identidade e cadastro do paciente
2. **Conversation** - Comunicação via WhatsApp
3. **Appointment** - Agendamentos e consultas
4. **PatientJourney** - Jornada e inteligência de retenção

Cada agregado é responsável por **garantir suas próprias invariantes** e **gerar eventos de domínio** quando seu estado muda.

Para o catálogo completo de eventos, veja [EVENTS.md](./EVENTS.md).

---

## Bounded Contexts

```
┌─────────────────────────────────────────────────────────────┐
│ PATIENT MANAGEMENT CONTEXT                                  │
│ ┌─────────────┐                                             │
│ │   Patient   │ - Identidade única                          │
│ └─────────────┘ - Cadastro e dados pessoais                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ COMMUNICATION CONTEXT                                        │
│ ┌──────────────┐                                            │
│ │ Conversation │ - Interações via WhatsApp                  │
│ └──────────────┘ - Mensagens e detecção de intenção         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SCHEDULING CONTEXT                                           │
│ ┌─────────────┐                                             │
│ │ Appointment │ - Agendamentos e confirmações               │
│ └─────────────┘ - Remarcações e no-shows                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ JOURNEY INTELLIGENCE CONTEXT                                 │
│ ┌────────────────┐                                          │
│ │ PatientJourney │ - Estágios da jornada                    │
│ └────────────────┘ - Detecção de risco e abandono           │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Agregado: Patient

### Propósito

Gerenciar a **identidade única** do paciente dentro de uma organização, garantindo que não haja duplicação e que dados pessoais sejam consistentes.

### Aggregate Root

**Patient** - Entidade principal que representa o paciente.

### Entidades Filhas

Nenhuma (agregado simples).

### Invariantes (Regras de Negócio)

✅ **Identidade Única**

- Telefone único dentro da organização
- CPF único globalmente (quando informado)
- Email único dentro da organização (quando informado)

✅ **Status Válido**

- Status deve ser: `active`, `inactive`, `suspended`
- Transições válidas:
  - `active` → `inactive`
  - `active` → `suspended`
  - `inactive` → `active` (reativação)
  - `suspended` → `active` (reabilitação)

✅ **Dados Obrigatórios**

- Telefone sempre obrigatório
- Nome completo obrigatório ao registrar
- Organization sempre obrigatória

✅ **LGPD / Privacidade**

- Paciente menor de 18 anos deve ter `guardian_phone`
- Dados sensíveis (`medical_history`) podem ser apagados sob demanda

### Comandos

```typescript
RegisterPatient {
  organizationId: UUID
  phone: string
  fullName: string
  email?: string
  birthDate?: Date
  cpf?: string
  registrationSource: 'whatsapp' | 'manual' | 'import'
}

UpdatePatientContact {
  patientId: UUID
  email?: string
  phone?: string
  address?: Address
}

UpdatePatientPreferences {
  patientId: UUID
  preferences: {
    communicationChannel?: 'whatsapp' | 'sms' | 'email'
    reminderEnabled?: boolean
    reminderTimeBefore?: number
  }
}

ChangePatientStatus {
  patientId: UUID
  newStatus: 'active' | 'inactive' | 'suspended'
  reason?: string
}

UpdateMedicalHistory {
  patientId: UUID
  medicalHistory: {
    allergies?: string[]
    chronicConditions?: string[]
    medications?: string[]
  }
}

AnonymizePatient {
  patientId: UUID
  reason: string
  requestedBy: UUID
}
```

### Eventos Gerados

Ver seção correspondente em [EVENTS.md](./EVENTS.md#patient-events):

- `PatientRegistered`
- `PatientContactUpdated`
- `PatientPreferencesUpdated`
- `PatientStatusChanged`
- `PatientMedicalHistoryUpdated`
- `PatientAnonymized`

### Ciclo de Vida

```
[Novo telefone entra em contato]
        ↓
   PatientRegistered
        ↓
    ┌─────────┐
    │  ACTIVE │ ←──── Reativação ←──── INACTIVE
    └─────────┘
         │
         ├──→ SUSPENDED (temporário)
         │
         └──→ INACTIVE (parou de usar)

[Direito ao esquecimento]
        ↓
   PatientAnonymized
        ↓
    [Dados apagados, apenas ID permanece]
```

### Exemplo de Uso

```typescript
// Paciente entra em contato pela primeira vez
const command = new RegisterPatient({
  organizationId: "org-123",
  phone: "+5511999999999",
  fullName: "Maria Silva",
  registrationSource: "whatsapp",
});

const patient = Patient.register(command);
// → Valida telefone único
// → Gera PatientRegistered
// → Persiste no Event Store

await eventStore.append(patient.uncommittedEvents);
```

---

## 2️⃣ Agregado: Conversation

### Propósito

Gerenciar **comunicação via WhatsApp** entre paciente e clínica, rastrear mensagens, detectar intenções e determinar quando escalar para atendimento humano.

### Aggregate Root

**Conversation** - Representa uma conversa contínua com um paciente.

### Entidades Filhas

**Message** - Mensagem individual (enviada ou recebida)

```typescript
Message {
  id: UUID
  conversationId: UUID
  direction: 'inbound' | 'outbound'
  content: string
  timestamp: DateTime
  sender: 'patient' | 'bot' | 'agent'
  agentId?: UUID
  metadata?: {
    mediaType?: 'text' | 'image' | 'audio' | 'document'
    mediaUrl?: string
    detectedIntent?: string
    confidence?: number
  }
}
```

### Invariantes (Regras de Negócio)

✅ **Contexto Único**

- Conversa pertence a um paciente E uma clínica
- Paciente pode ter múltiplas conversas (histórico), mas apenas uma "ativa" por clínica

✅ **Ordenação Temporal**

- Mensagens são imutáveis após criação
- Ordem cronológica sempre respeitada (via `timestamp`)

✅ **Máquina de Estados**

- Estados válidos: `initiated`, `active`, `awaiting_response`, `escalated`, `closed`
- Transições:

```
  initiated → active → awaiting_response → [escalated | closed]
```

✅ **Escalação**

- Conversa escalada não pode voltar para bot automaticamente
- Apenas agente pode "resolver" e fechar conversa escalada

✅ **Rate Limiting**

- Bot não envia mais de 3 mensagens consecutivas sem resposta do paciente
- Previne spam

### Comandos

```typescript
StartConversation {
  patientId: UUID
  clinicId: UUID
  initiatedBy: 'patient' | 'system'
  initialMessage?: string
}

ReceiveMessage {
  conversationId: UUID
  content: string
  timestamp: DateTime
  metadata?: MessageMetadata
}

SendMessage {
  conversationId: UUID
  content: string
  sender: 'bot' | 'agent'
  agentId?: UUID
}

DetectIntent {
  conversationId: UUID
  messageId: UUID
  detectedIntent: string
  confidence: number
  extractedData?: object
}

EscalateToHuman {
  conversationId: UUID
  reason: 'low_confidence' | 'explicit_request' | 'complex_query' | 'complaint'
  triggeringMessageId?: UUID
}

AssignAgent {
  conversationId: UUID
  agentId: UUID
}

ResolveEscalation {
  conversationId: UUID
  resolvedBy: UUID
  resolutionNotes?: string
}

CloseConversation {
  conversationId: UUID
  closedBy: 'bot' | 'agent' | 'system'
  reason?: string
}
```

### Eventos Gerados

Ver seção correspondente em [EVENTS.md](./EVENTS.md#conversation-events):

- `ConversationStarted`
- `MessageReceived`
- `MessageSent`
- `IntentDetected`
- `ConversationEscalated`
- `AgentAssigned`
- `EscalationResolved`
- `ConversationClosed`

### Ciclo de Vida

```
[Paciente envia mensagem]
        ↓
  ConversationStarted
        ↓
    ┌────────┐
    │ ACTIVE │ ←──→ AWAITING_RESPONSE
    └────────┘
         │
         ├──→ ESCALATED ──→ [Agente resolve] ──→ CLOSED
         │
         └──→ CLOSED (inatividade ou resolução)
```

### Exemplo de Uso

```typescript
// Mensagem chega do WhatsApp
const conversation =
  (await conversationRepo.findActive(patientId, clinicId)) ||
  Conversation.start({
    patientId,
    clinicId,
    initiatedBy: "patient",
  });

conversation.receiveMessage({
  content: "Quero marcar consulta",
  timestamp: new Date(),
});

// Decision Engine detecta intenção
conversation.detectIntent({
  messageId: lastMessageId,
  intent: "schedule_appointment",
  confidence: 0.92,
});

// Se alta confiança, bot responde
if (intent.confidence > 0.8) {
  conversation.sendMessage({
    content: "Ótimo! Qual data você prefere?",
    sender: "bot",
  });
} else {
  // Se baixa confiança, escala
  conversation.escalateToHuman({
    reason: "low_confidence",
  });
}
```

---

## 3️⃣ Agregado: Appointment

### Propósito

Gerenciar **agendamentos de consultas**, garantindo que não haja conflitos de horário e que o ciclo de vida da consulta seja rastreado (agendamento → confirmação → realização/falta).

### Aggregate Root

**Appointment** - Representa um agendamento de consulta.

### Entidades Filhas

**AppointmentConfirmation** - Confirmações do paciente

```typescript
AppointmentConfirmation {
  id: UUID
  appointmentId: UUID
  confirmedAt: DateTime
  confirmationMethod: 'whatsapp' | 'phone' | 'in_person'
  confirmedBy: 'patient' | 'agent'
}
```

**AppointmentReminder** - Lembretes enviados

```typescript
AppointmentReminder {
  id: UUID
  appointmentId: UUID
  sentAt: DateTime
  scheduledFor: DateTime
  channel: 'whatsapp' | 'sms' | 'email'
  status: 'sent' | 'failed' | 'delivered' | 'read'
}
```

### Invariantes (Regras de Negócio)

✅ **Sem Conflitos de Horário**

- Médico não pode ter 2 consultas simultâneas
- Paciente não pode ter 2 consultas simultâneas
- Validação no momento do agendamento

✅ **Temporal**

- Não pode agendar no passado
- Não pode agendar fora do horário de funcionamento da clínica
- Não pode agendar em dia/horário indisponível do médico

✅ **Transições de Status**

```
scheduled → confirmed → completed
         ↘ cancelled
         ↘ no_show
         ↘ rescheduled → [volta para scheduled]
```

✅ **Remarcação**

- Só pode remarcar se status for `scheduled` ou `confirmed`
- Não pode remarcar consulta `completed`, `cancelled` ou `no_show`

✅ **Confirmação**

- Pode confirmar múltiplas vezes
- Última confirmação é a válida

### Comandos

```typescript
ScheduleAppointment {
  patientId: UUID
  clinicId: UUID
  doctorId: UUID
  scheduledFor: DateTime
  duration: number
  appointmentType: 'first_visit' | 'follow_up' | 'return' | 'emergency'
  notes?: string
  scheduledBy: 'patient' | 'agent' | 'doctor'
}

ConfirmAppointment {
  appointmentId: UUID
  confirmedBy: 'patient' | 'agent'
  confirmationMethod: 'whatsapp' | 'phone' | 'in_person'
}

RescheduleAppointment {
  appointmentId: UUID
  newScheduledFor: DateTime
  reason?: string
  rescheduledBy: 'patient' | 'agent' | 'doctor'
}

CancelAppointment {
  appointmentId: UUID
  reason?: string
  cancelledBy: 'patient' | 'agent' | 'doctor'
}

MarkAsNoShow {
  appointmentId: UUID
  markedBy: UUID
  notes?: string
}

CompleteAppointment {
  appointmentId: UUID
  completedAt: DateTime
  notes?: string
}

SendReminder {
  appointmentId: UUID
  channel: 'whatsapp' | 'sms' | 'email'
  scheduledFor: DateTime
}
```

### Eventos Gerados

Ver seção correspondente em [EVENTS.md](./EVENTS.md#appointment-events):

- `AppointmentScheduled`
- `AppointmentConfirmed`
- `AppointmentRescheduled`
- `AppointmentCancelled`
- `AppointmentMarkedAsNoShow`
- `AppointmentCompleted`
- `AppointmentReminderSent`
- `AppointmentReminderFailed`

### Ciclo de Vida

```
[Agendamento criado]
        ↓
  AppointmentScheduled
        ↓
    ┌───────────┐
    │ SCHEDULED │
    └───────────┘
         │
         ├──→ CONFIRMED
         │       │
         │       ├──→ COMPLETED
         │       └──→ NO_SHOW
         │
         ├──→ RESCHEDULED ──→ volta para SCHEDULED
         │
         └──→ CANCELLED
```

### Exemplo de Uso

```typescript
// Sistema cria agendamento após detectar intenção
const command = new ScheduleAppointment({
  patientId: "patient-456",
  clinicId: "clinic-abc",
  doctorId: "doctor-123",
  scheduledFor: new Date("2025-02-15T14:00:00"),
  duration: 30,
  appointmentType: "first_visit",
  scheduledBy: "patient",
});

const appointment = Appointment.schedule(command);
// → Valida conflitos de horário
// → Valida horário de funcionamento
// → Gera AppointmentScheduled

await eventStore.append(appointment.uncommittedEvents);

// Sistema agenda lembrete automaticamente
appointment.scheduleReminder({
  channel: "whatsapp",
  scheduledFor: subDays(appointment.scheduledFor, 1),
});
```

---

## 4️⃣ Agregado: PatientJourney

### Propósito

Rastrear a **jornada completa do paciente** ao longo do tempo, detectar **riscos de abandono**, calcular **score de retenção** e disparar **ações proativas** no momento certo.

**Este é o agregado mais estratégico do Healz** - é onde a inteligência acontece.

### Aggregate Root

**PatientJourney** - Representa a jornada de um paciente em uma clínica específica.

### Entidades Filhas

**JourneyStage** - Estágio atual da jornada

```typescript
JourneyStage {
  stage: 'initiated' | 'first_contact' | 'scheduled' | 'attended' | 'follow_up' | 'returned'
  enteredAt: DateTime
  metadata?: object
}
```

**RiskIndicator** - Indicadores de risco calculados

```typescript
RiskIndicator {
  type: 'silence' | 'delay' | 'cancellation' | 'tone_change' | 'no_show'
  severity: 'low' | 'medium' | 'high'
  detectedAt: DateTime
  value: number
  metadata?: object
}
```

### Invariantes (Regras de Negócio)

✅ **Jornada Única Ativa**

- Paciente tem UMA jornada ativa por clínica
- Pode ter histórico de jornadas passadas (concluídas/abandonadas)

✅ **Progressão de Estágios**

- Estágios seguem ordem lógica
- Exceção: Pode entrar em "at_risk" ou "abandoned" de qualquer estágio

✅ **Risk Score**

- Score entre 0.0 (sem risco) e 1.0 (risco máximo)
- Recalculado a cada evento relevante
- Baseado em múltiplos indicadores ponderados

✅ **Detecção de Padrões**

- Sistema analisa eventos ao longo do tempo
- Identifica padrões de abandono
- Não depende de input manual

### Comandos

```typescript
StartJourney {
  patientId: UUID
  clinicId: UUID
  initiatedBy: 'first_contact' | 'appointment_scheduled' | 'manual'
}

AdvanceStage {
  journeyId: UUID
  newStage: JourneyStage
  reason?: string
}

DetectRisk {
  journeyId: UUID
  riskType: 'silence' | 'delay' | 'cancellation' | 'tone_change' | 'no_show'
  severity: 'low' | 'medium' | 'high'
  value: number
  metadata?: object
}

RecalculateRiskScore {
  journeyId: UUID
}

EscalateRisk {
  journeyId: UUID
  escalationReason: string
  assignedTo?: UUID
}

MarkAsRecovered {
  journeyId: UUID
  recoveryReason: string
}

MarkAsAbandoned {
  journeyId: UUID
  abandonmentReason: string
}

CompleteJourney {
  journeyId: UUID
  completionReason: 'successful_treatment' | 'patient_moved' | 'other'
}
```

### Eventos Gerados

Ver seção correspondente em [EVENTS.md](./EVENTS.md#patientjourney-events):

- `JourneyStarted`
- `JourneyStageChanged`
- `RiskDetected`
- `RiskScoreRecalculated`
- `RiskEscalated`
- `JourneyRecovered`
- `JourneyAbandoned`
- `JourneyCompleted`

### Ciclo de Vida

```
[Paciente entra no sistema]
        ↓
   JourneyStarted
        ↓
    ┌──────────────┐
    │ FIRST_CONTACT│
    └──────────────┘
         │
         ├──→ SCHEDULED
         │       │
         │       ├──→ ATTENDED
         │       │       │
         │       │       └──→ FOLLOW_UP → RETURNED
         │       │
         │       └──→ NO_SHOW → AT_RISK
         │
         ├──→ AT_RISK
         │       │
         │       ├──→ ABANDONED
         │       └──→ RECOVERED
         │
         └──→ COMPLETED
```

### Exemplo de Uso

```typescript
// Job detecta silêncio prolongado
const journey = PatientJourney.fromHistory(events);
const daysSinceLastInteraction = journey.daysSinceLastInteraction();

if (daysSinceLastInteraction >= 14) {
  journey.detectRisk({
    riskType: "silence",
    severity: "high",
    value: 0.8,
  });

  journey.recalculateRiskScore();
  // → Novo score: 0.75

  if (journey.riskScore > 0.7) {
    journey.escalateRisk({
      escalationReason: "High risk of abandonment",
      assignedTo: "manager-123",
    });
  }
}
```

---

## 🔗 Relacionamentos entre Agregados

### Referências Permitidas

```typescript
// ✅ CERTO - Referências por ID
class PatientJourney {
  patientId: UUID;
  clinicId: UUID;
  relatedConversationIds: UUID[];
  relatedAppointmentIds: UUID[];
}

// ❌ ERRADO - Objetos completos
class PatientJourney {
  patient: Patient;
  conversations: Conversation[];
}
```

### Comunicação via Eventos

```typescript
// Appointment gera evento
appointment.markAsNoShow();
// → AppointmentMarkedAsNoShow

// PatientJourney escuta e reage
eventBus.on("AppointmentMarkedAsNoShow", (event) => {
  journey.detectRisk({
    riskType: "no_show",
    severity: "high",
    value: 0.9,
  });
});
```

### Matriz de Dependências

| De \ Para          | Patient | Conversation | Appointment | PatientJourney |
| ------------------ | ------- | ------------ | ----------- | -------------- |
| **Patient**        | -       | ❌           | ❌          | ❌             |
| **Conversation**   | ✅ (ID) | -            | ❌          | ❌             |
| **Appointment**    | ✅ (ID) | ❌           | -           | ❌             |
| **PatientJourney** | ✅ (ID) | ✅ (IDs)     | ✅ (IDs)    | -              |

---

## 🎯 Decisões Arquiteturais

### 1. Tamanho dos Agregados

**Decisão:** Manter agregados pequenos e focados

**Razão:**

- Facilita testes
- Reduz conflitos de concorrência
- Melhora performance

### 2. Eventos vs Comandos

**Decisão:** Comandos podem falhar, eventos são fatos

- Comando = intenção (pode ser rejeitado)
- Evento = fato consumado (imutável)

### 3. Versionamento de Agregados

**Decisão:** Usar `aggregate_version` no Event Store

**Razão:** Detectar conflitos de concorrência (optimistic locking)

### 4. PatientJourney como Agregado Separado

**Decisão:** Journey é separado de Patient

**Razão:**

- Patient = identidade (muda pouco)
- Journey = processo (muda muito)
- Paciente pode ter múltiplas jornadas ao longo do tempo

---

## 📊 Volume Estimado de Eventos

| Agregado       | Eventos/mês (100 pacientes) | Volume anual |
| -------------- | --------------------------- | ------------ |
| Patient        | ~150                        | ~1.800       |
| Conversation   | ~5.000                      | ~60.000      |
| Appointment    | ~800                        | ~9.600       |
| PatientJourney | ~1.200                      | ~14.400      |
| **Total**      | **~7.150**                  | **~85.800**  |

**Com 1.000 pacientes:** ~858.000 eventos/ano

---

## 📚 Documentação Relacionada

- [EVENTS.md](./EVENTS.md) - Catálogo completo de eventos
- [DATABASE.md](./DATABASE.md) - Event Store e schema
- [STATE_MACHINE.md](./STATE_MACHINE.md) - Máquina de estados (próximo)
- [PROJECTIONS.md](./PROJECTIONS.md) - Read Models (próximo)

---

## ✅ Status

- ✅ Agregados definidos
- ✅ Invariantes especificadas
- ✅ Comandos listados
- ✅ Eventos mapeados (detalhes em EVENTS.md)
- ✅ Ciclos de vida documentados
- ✅ Relacionamentos esclarecidos

# Catálogo de Eventos - Healz

## Visão Geral

Este documento contém o **catálogo completo de eventos de domínio** do Healz. Eventos são **fatos imutáveis** que aconteceram no sistema e são armazenados no Event Store.

Para entender os agregados que geram esses eventos, veja [AGGREGATES.md](./AGGREGATES.md).

---

## Estrutura de um Evento

Todos os eventos seguem a estrutura do Event Store:

```typescript
Event {
  // Metadados do Event Store
  id: BIGSERIAL                    // ID sequencial
  event_id: UUID                   // ID único global
  event_type: string               // Tipo do evento
  aggregate_type: string           // Tipo do agregado
  aggregate_id: UUID               // ID do agregado
  aggregate_version: number        // Versão sequencial
  tenant_id: UUID                  // Organização
  clinic_id: UUID | null           // Clínica (opcional)
  causation_id: UUID | null        // Evento que causou este
  correlation_id: UUID             // Agrupa operação completa
  user_id: UUID | null             // Quem iniciou
  created_at: DateTime             // Timestamp

  // Payload específico do evento
  event_data: {
    // Varia por tipo de evento
  }

  // Metadados flexíveis
  metadata: {
    ip_address?: string
    user_agent?: string
    // ... outros metadados
  }
}
```

---

## Convenções de Nomenclatura

### Event Types

- **Formato:** `AggregateNameEventName` (PascalCase, passado)
- **Exemplos:** `PatientRegistered`, `AppointmentScheduled`, `MessageReceived`
- **Regra:** Sempre no passado (é um fato que aconteceu)

### Event Data

- **Formato:** camelCase para campos
- **Regra:** Apenas dados necessários para reconstruir estado
- **Imutabilidade:** Nunca mude schema de evento publicado (versione se necessário)

---

## Versionamento de Eventos

Quando schema de evento precisa mudar:

```typescript
// Versão 1
event_type: "PatientRegistered"
event_data: {
  phone: string
  fullName: string
}

// Versão 2 (campo novo adicionado)
event_type: "PatientRegistered"
event_data: {
  phone: string
  fullName: string
  email?: string  // novo campo opcional
}

// Se mudança quebra contrato, criar novo tipo
event_type: "PatientRegisteredV2"
```

**Regra:** Sempre manter compatibilidade retroativa quando possível.

---

## 1️⃣ Patient Events

### PatientRegistered

**Quando:** Novo paciente é cadastrado no sistema

**Aggregate:** Patient  
**Versão:** 1.0

```json
{
  "event_type": "PatientRegistered",
  "aggregate_type": "Patient",
  "aggregate_id": "550e8400-e29b-41d4-a716-446655440000",
  "aggregate_version": 1,
  "tenant_id": "org-123",
  "clinic_id": null,
  "event_data": {
    "patient_id": "550e8400-e29b-41d4-a716-446655440000",
    "organization_id": "org-123",
    "phone": "+5511999999999",
    "full_name": "Maria Silva",
    "email": "maria@example.com",
    "birth_date": "1985-03-15",
    "cpf": "12345678901",
    "registration_source": "whatsapp",
    "registered_at": "2025-01-29T10:00:00Z"
  }
}
```

**Campos obrigatórios:**

- `patient_id` (UUID)
- `organization_id` (UUID)
- `phone` (string)
- `full_name` (string)
- `registration_source` (enum: whatsapp, manual, import)
- `registered_at` (DateTime)

**Campos opcionais:**

- `email` (string)
- `birth_date` (Date)
- `cpf` (string)

---

### PatientContactUpdated

**Quando:** Informações de contato do paciente são atualizadas

**Aggregate:** Patient  
**Versão:** 1.0

```json
{
  "event_type": "PatientContactUpdated",
  "aggregate_type": "Patient",
  "aggregate_id": "550e8400-e29b-41d4-a716-446655440000",
  "aggregate_version": 2,
  "event_data": {
    "patient_id": "550e8400-e29b-41d4-a716-446655440000",
    "previous_phone": "+5511999999999",
    "new_phone": "+5511988888888",
    "previous_email": "maria@example.com",
    "new_email": "maria.silva@example.com",
    "address": {
      "street": "Rua das Flores",
      "number": "123",
      "complement": "Apto 45",
      "neighborhood": "Jardins",
      "city": "São Paulo",
      "state": "SP",
      "zip_code": "01234-567"
    },
    "updated_at": "2025-01-29T14:30:00Z"
  }
}
```

**Campos obrigatórios:**

- `patient_id` (UUID)
- `updated_at` (DateTime)

**Campos opcionais:**

- `previous_phone`, `new_phone` (string)
- `previous_email`, `new_email` (string)
- `address` (object)

---

### PatientPreferencesUpdated

**Quando:** Preferências de comunicação do paciente são atualizadas

**Aggregate:** Patient  
**Versão:** 1.0

```json
{
  "event_type": "PatientPreferencesUpdated",
  "aggregate_type": "Patient",
  "aggregate_id": "550e8400-e29b-41d4-a716-446655440000",
  "aggregate_version": 3,
  "event_data": {
    "patient_id": "550e8400-e29b-41d4-a716-446655440000",
    "preferences": {
      "communication_channel": "whatsapp",
      "reminder_enabled": true,
      "reminder_time_before": 1440
    },
    "updated_at": "2025-01-29T15:00:00Z"
  }
}
```

**Campo preferences:**

- `communication_channel` (enum: whatsapp, sms, email)
- `reminder_enabled` (boolean)
- `reminder_time_before` (number, em minutos)

---

### PatientStatusChanged

**Quando:** Status do paciente muda

**Aggregate:** Patient  
**Versão:** 1.0

```json
{
  "event_type": "PatientStatusChanged",
  "aggregate_type": "Patient",
  "aggregate_id": "550e8400-e29b-41d4-a716-446655440000",
  "aggregate_version": 4,
  "event_data": {
    "patient_id": "550e8400-e29b-41d4-a716-446655440000",
    "previous_status": "active",
    "new_status": "inactive",
    "reason": "Patient moved to another city",
    "changed_at": "2025-01-29T16:00:00Z",
    "changed_by": "admin-789"
  }
}
```

**Status válidos:** active, inactive, suspended

---

### PatientMedicalHistoryUpdated

**Quando:** Histórico médico do paciente é atualizado

**Aggregate:** Patient  
**Versão:** 1.0

```json
{
  "event_type": "PatientMedicalHistoryUpdated",
  "aggregate_type": "Patient",
  "aggregate_id": "550e8400-e29b-41d4-a716-446655440000",
  "aggregate_version": 5,
  "event_data": {
    "patient_id": "550e8400-e29b-41d4-a716-446655440000",
    "medical_history": {
      "allergies": ["penicilina", "dipirona"],
      "chronic_conditions": ["hipertensão"],
      "medications": ["losartana 50mg"]
    },
    "updated_at": "2025-01-29T17:00:00Z"
  }
}
```

---

### PatientAnonymized

**Quando:** Paciente exerce direito ao esquecimento (LGPD)

**Aggregate:** Patient  
**Versão:** 1.0

```json
{
  "event_type": "PatientAnonymized",
  "aggregate_type": "Patient",
  "aggregate_id": "550e8400-e29b-41d4-a716-446655440000",
  "aggregate_version": 6,
  "event_data": {
    "patient_id": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "Patient requested data deletion under LGPD",
    "anonymized_at": "2025-01-29T18:00:00Z",
    "requested_by": "patient-456"
  }
}
```

**Importante:** Dados pessoais já foram apagados antes deste evento ser gerado.

---

## 2️⃣ Conversation Events

### ConversationStarted

**Quando:** Nova conversa é iniciada

**Aggregate:** Conversation  
**Versão:** 1.0

```json
{
  "event_type": "ConversationStarted",
  "aggregate_type": "Conversation",
  "aggregate_id": "conv-123",
  "aggregate_version": 1,
  "tenant_id": "org-123",
  "clinic_id": "clinic-abc",
  "event_data": {
    "conversation_id": "conv-123",
    "patient_id": "patient-456",
    "clinic_id": "clinic-abc",
    "initiated_by": "patient",
    "started_at": "2025-01-29T10:00:00Z"
  }
}
```

**initiated_by:** patient, system

---

### MessageReceived

**Quando:** Mensagem do paciente é recebida

**Aggregate:** Conversation  
**Versão:** 1.0

```json
{
  "event_type": "MessageReceived",
  "aggregate_type": "Conversation",
  "aggregate_id": "conv-123",
  "aggregate_version": 2,
  "event_data": {
    "conversation_id": "conv-123",
    "message_id": "msg-001",
    "content": "Oi, quero marcar uma consulta",
    "timestamp": "2025-01-29T10:01:00Z",
    "metadata": {
      "media_type": "text",
      "whatsapp_message_id": "wamid.xxx"
    }
  }
}
```

**media_type:** text, image, audio, document, video

---

### MessageSent

**Quando:** Mensagem é enviada para o paciente

**Aggregate:** Conversation  
**Versão:** 1.0

```json
{
  "event_type": "MessageSent",
  "aggregate_type": "Conversation",
  "aggregate_id": "conv-123",
  "aggregate_version": 3,
  "event_data": {
    "conversation_id": "conv-123",
    "message_id": "msg-002",
    "content": "Claro! Qual data você prefere?",
    "sender": "bot",
    "agent_id": null,
    "timestamp": "2025-01-29T10:01:30Z"
  }
}
```

**sender:** bot, agent

---

### IntentDetected

**Quando:** Decision Engine detecta intenção na mensagem

**Aggregate:** Conversation  
**Versão:** 1.0

```json
{
  "event_type": "IntentDetected",
  "aggregate_type": "Conversation",
  "aggregate_id": "conv-123",
  "aggregate_version": 4,
  "event_data": {
    "conversation_id": "conv-123",
    "message_id": "msg-001",
    "intent": "schedule_appointment",
    "confidence": 0.92,
    "extracted_data": {
      "preferred_date": "2025-02-15",
      "preferred_time": null,
      "doctor": null
    },
    "detected_at": "2025-01-29T10:01:15Z"
  }
}
```

**Intents comuns:**

- schedule_appointment
- cancel_appointment
- reschedule_appointment
- general_inquiry
- complaint
- request_human_agent

---

### ConversationEscalated

**Quando:** Conversa é escalada para atendimento humano

**Aggregate:** Conversation  
**Versão:** 1.0

```json
{
  "event_type": "ConversationEscalated",
  "aggregate_type": "Conversation",
  "aggregate_id": "conv-123",
  "aggregate_version": 5,
  "event_data": {
    "conversation_id": "conv-123",
    "reason": "low_confidence",
    "triggering_message_id": "msg-001",
    "escalated_at": "2025-01-29T10:02:00Z"
  }
}
```

**reason:** low_confidence, explicit_request, complex_query, complaint

---

### AgentAssigned

**Quando:** Agente humano é atribuído à conversa

**Aggregate:** Conversation  
**Versão:** 1.0

```json
{
  "event_type": "AgentAssigned",
  "aggregate_type": "Conversation",
  "aggregate_id": "conv-123",
  "aggregate_version": 6,
  "event_data": {
    "conversation_id": "conv-123",
    "agent_id": "agent-789",
    "assigned_at": "2025-01-29T10:03:00Z"
  }
}
```

---

### EscalationResolved

**Quando:** Agente resolve a escalação

**Aggregate:** Conversation  
**Versão:** 1.0

```json
{
  "event_type": "EscalationResolved",
  "aggregate_type": "Conversation",
  "aggregate_id": "conv-123",
  "aggregate_version": 7,
  "event_data": {
    "conversation_id": "conv-123",
    "resolved_by": "agent-789",
    "resolution_notes": "Paciente agendado para 15/02 às 14h",
    "resolved_at": "2025-01-29T10:10:00Z"
  }
}
```

---

### ConversationClosed

**Quando:** Conversa é encerrada

**Aggregate:** Conversation  
**Versão:** 1.0

```json
{
  "event_type": "ConversationClosed",
  "aggregate_type": "Conversation",
  "aggregate_id": "conv-123",
  "aggregate_version": 8,
  "event_data": {
    "conversation_id": "conv-123",
    "closed_by": "agent",
    "reason": "Issue resolved",
    "closed_at": "2025-01-29T10:15:00Z"
  }
}
```

**closed_by:** bot, agent, system

---

## 3️⃣ Appointment Events

### AppointmentScheduled

**Quando:** Nova consulta é agendada

**Aggregate:** Appointment  
**Versão:** 1.0

```json
{
  "event_type": "AppointmentScheduled",
  "aggregate_type": "Appointment",
  "aggregate_id": "appt-123",
  "aggregate_version": 1,
  "tenant_id": "org-123",
  "clinic_id": "clinic-abc",
  "event_data": {
    "appointment_id": "appt-123",
    "patient_id": "patient-456",
    "clinic_id": "clinic-abc",
    "doctor_id": "doctor-789",
    "scheduled_for": "2025-02-15T14:00:00Z",
    "duration": 30,
    "appointment_type": "first_visit",
    "notes": null,
    "scheduled_by": "patient",
    "scheduled_at": "2025-01-29T10:05:00Z"
  }
}
```

**appointment_type:** first_visit, follow_up, return, emergency

**scheduled_by:** patient, agent, doctor

---

### AppointmentConfirmed

**Quando:** Paciente confirma a consulta

**Aggregate:** Appointment  
**Versão:** 1.0

```json
{
  "event_type": "AppointmentConfirmed",
  "aggregate_type": "Appointment",
  "aggregate_id": "appt-123",
  "aggregate_version": 2,
  "event_data": {
    "appointment_id": "appt-123",
    "confirmed_by": "patient",
    "confirmation_method": "whatsapp",
    "confirmed_at": "2025-02-14T10:00:00Z",
    "confirmation_count": 1
  }
}
```

**confirmation_method:** whatsapp, phone, in_person

---

### AppointmentRescheduled

**Quando:** Consulta é remarcada

**Aggregate:** Appointment  
**Versão:** 1.0

```json
{
  "event_type": "AppointmentRescheduled",
  "aggregate_type": "Appointment",
  "aggregate_id": "appt-123",
  "aggregate_version": 3,
  "event_data": {
    "appointment_id": "appt-123",
    "previous_scheduled_for": "2025-02-15T14:00:00Z",
    "new_scheduled_for": "2025-02-16T15:00:00Z",
    "reason": "Patient had a conflict",
    "rescheduled_by": "patient",
    "rescheduled_at": "2025-02-10T09:00:00Z"
  }
}
```

---

### AppointmentCancelled

**Quando:** Consulta é cancelada

**Aggregate:** Appointment  
**Versão:** 1.0

```json
{
  "event_type": "AppointmentCancelled",
  "aggregate_type": "Appointment",
  "aggregate_id": "appt-123",
  "aggregate_version": 4,
  "event_data": {
    "appointment_id": "appt-123",
    "reason": "Patient no longer needs consultation",
    "cancelled_by": "patient",
    "cancelled_at": "2025-02-14T16:00:00Z"
  }
}
```

---

### AppointmentMarkedAsNoShow

**Quando:** Paciente falta à consulta

**Aggregate:** Appointment  
**Versão:** 1.0

```json
{
  "event_type": "AppointmentMarkedAsNoShow",
  "aggregate_type": "Appointment",
  "aggregate_id": "appt-123",
  "aggregate_version": 5,
  "event_data": {
    "appointment_id": "appt-123",
    "scheduled_for": "2025-02-15T14:00:00Z",
    "marked_by": "receptionist-456",
    "marked_at": "2025-02-15T14:15:00Z",
    "notes": "Patient did not show up, no call"
  }
}
```

---

### AppointmentCompleted

**Quando:** Consulta é realizada com sucesso

**Aggregate:** Appointment  
**Versão:** 1.0

```json
{
  "event_type": "AppointmentCompleted",
  "aggregate_type": "Appointment",
  "aggregate_id": "appt-123",
  "aggregate_version": 6,
  "event_data": {
    "appointment_id": "appt-123",
    "completed_at": "2025-02-15T14:30:00Z",
    "notes": "Follow-up scheduled for 3 months"
  }
}
```

---

### AppointmentReminderSent

**Quando:** Lembrete é enviado ao paciente

**Aggregate:** Appointment  
**Versão:** 1.0

```json
{
  "event_type": "AppointmentReminderSent",
  "aggregate_type": "Appointment",
  "aggregate_id": "appt-123",
  "aggregate_version": 7,
  "event_data": {
    "appointment_id": "appt-123",
    "reminder_id": "reminder-001",
    "channel": "whatsapp",
    "sent_at": "2025-02-14T14:00:00Z",
    "delivery_status": "delivered"
  }
}
```

**channel:** whatsapp, sms, email

**delivery_status:** sent, delivered, read, failed

---

### AppointmentReminderFailed

**Quando:** Falha ao enviar lembrete

**Aggregate:** Appointment  
**Versão:** 1.0

```json
{
  "event_type": "AppointmentReminderFailed",
  "aggregate_type": "Appointment",
  "aggregate_id": "appt-123",
  "aggregate_version": 8,
  "event_data": {
    "appointment_id": "appt-123",
    "reminder_id": "reminder-002",
    "channel": "sms",
    "failed_at": "2025-02-14T14:00:00Z",
    "error": "Invalid phone number"
  }
}
```

---

## 4️⃣ PatientJourney Events

### JourneyStarted

**Quando:** Jornada do paciente inicia

**Aggregate:** PatientJourney  
**Versão:** 1.0

```json
{
  "event_type": "JourneyStarted",
  "aggregate_type": "PatientJourney",
  "aggregate_id": "journey-789",
  "aggregate_version": 1,
  "tenant_id": "org-123",
  "clinic_id": "clinic-abc",
  "event_data": {
    "journey_id": "journey-789",
    "patient_id": "patient-456",
    "clinic_id": "clinic-abc",
    "initiated_by": "first_contact",
    "started_at": "2025-01-29T10:00:00Z"
  }
}
```

**initiated_by:** first_contact, appointment_scheduled, manual

---

### JourneyStageChanged

**Quando:** Estágio da jornada muda

**Aggregate:** PatientJourney  
**Versão:** 1.0

```json
{
  "event_type": "JourneyStageChanged",
  "aggregate_type": "PatientJourney",
  "aggregate_id": "journey-789",
  "aggregate_version": 2,
  "event_data": {
    "journey_id": "journey-789",
    "previous_stage": "first_contact",
    "new_stage": "scheduled",
    "reason": "Appointment created",
    "changed_at": "2025-01-29T10:05:00Z"
  }
}
```

**Stages:** initiated, first_contact, scheduled, attended, follow_up, returned, at_risk, abandoned, completed

---

### RiskDetected

**Quando:** Sistema detecta risco de abandono

**Aggregate:** PatientJourney  
**Versão:** 1.0

```json
{
  "event_type": "RiskDetected",
  "aggregate_type": "PatientJourney",
  "aggregate_id": "journey-789",
  "aggregate_version": 3,
  "event_data": {
    "journey_id": "journey-789",
    "risk_type": "silence",
    "severity": "high",
    "value": 0.8,
    "metadata": {
      "days_since_last_interaction": 14,
      "expected_interaction_frequency": 3
    },
    "detected_at": "2025-02-12T08:00:00Z"
  }
}
```

**risk_type:** silence, delay, cancellation, tone_change, no_show

**severity:** low, medium, high

---

### RiskScoreRecalculated

**Quando:** Score de risco total é recalculado

**Aggregate:** PatientJourney  
**Versão:** 1.0

```json
{
  "event_type": "RiskScoreRecalculated",
  "aggregate_type": "PatientJourney",
  "aggregate_id": "journey-789",
  "aggregate_version": 4,
  "event_data": {
    "journey_id": "journey-789",
    "previous_score": 0.3,
    "new_score": 0.75,
    "recalculated_at": "2025-02-12T08:00:30Z",
    "contributing_factors": [
      {
        "type": "silence",
        "weight": 0.4,
        "value": 0.8
      },
      {
        "type": "no_show",
        "weight": 0.3,
        "value": 0.9
      },
      {
        "type": "cancellation",
        "weight": 0.3,
        "value": 0.5
      }
    ]
  }
}
```

---

### RiskEscalated

**Quando:** Risco é escalado para gestor

**Aggregate:** PatientJourney  
**Versão:** 1.0

```json
{
  "event_type": "RiskEscalated",
  "aggregate_type": "PatientJourney",
  "aggregate_id": "journey-789",
  "aggregate_version": 5,
  "event_data": {
    "journey_id": "journey-789",
    "escalation_reason": "High risk of abandonment - 14 days silent",
    "assigned_to": "manager-123",
    "escalated_at": "2025-02-12T08:01:00Z"
  }
}
```

---

### JourneyRecovered

**Quando:** Paciente retoma contato após risco

**Aggregate:** PatientJourney  
**Versão:** 1.0

```json
{
  "event_type": "JourneyRecovered",
  "aggregate_type": "PatientJourney",
  "aggregate_id": "journey-789",
  "aggregate_version": 6,
  "event_data": {
    "journey_id": "journey-789",
    "recovery_reason": "Patient responded to outreach",
    "recovered_at": "2025-02-15T10:00:00Z",
    "previous_risk_score": 0.75
  }
}
```

---

### JourneyAbandoned

**Quando:** Jornada é marcada como abandonada

**Aggregate:** PatientJourney  
**Versão:** 1.0

```json
{
  "event_type": "JourneyAbandoned",
  "aggregate_type": "PatientJourney",
  "aggregate_id": "journey-789",
  "aggregate_version": 7,
  "event_data": {
    "journey_id": "journey-789",
    "abandonment_reason": "No response after 30 days",
    "abandoned_at": "2025-03-01T08:00:00Z",
    "final_risk_score": 0.95
  }
}
```

---

### JourneyCompleted

**Quando:** Jornada é concluída com sucesso

**Aggregate:** PatientJourney  
**Versão:** 1.0

```json
{
  "event_type": "JourneyCompleted",
  "aggregate_type": "PatientJourney",
  "aggregate_id": "journey-789",
  "aggregate_version": 8,
  "event_data": {
    "journey_id": "journey-789",
    "completion_reason": "successful_treatment",
    "completed_at": "2025-06-01T10:00:00Z",
    "total_duration": 123,
    "statistics": {
      "total_appointments": 5,
      "no_show_count": 0,
      "cancellation_count": 1,
      "average_risk_score": 0.15
    }
  }
}
```

**completion_reason:** successful_treatment, patient_moved, other

---

## 📊 Resumo de Eventos por Agregado

| Agregado       | Total de Tipos de Eventos | Mais Frequente        |
| -------------- | ------------------------- | --------------------- |
| Patient        | 6                         | PatientRegistered     |
| Conversation   | 8                         | MessageReceived/Sent  |
| Appointment    | 8                         | AppointmentScheduled  |
| PatientJourney | 8                         | RiskScoreRecalculated |
| **Total**      | **30**                    | -                     |

---

## 🔄 Correlação de Eventos

Exemplo de fluxo completo com correlation_id:

```
correlation_id: "flow-schedule-001"
├─ MessageReceived (patient: "quero marcar consulta")
├─ IntentDetected (intent: schedule_appointment)
├─ AppointmentScheduled (15/02 às 14h)
├─ MessageSent (bot: "Consulta agendada!")
├─ JourneyStageChanged (first_contact → scheduled)
└─ AppointmentReminderSent (lembrete 24h antes)
```

---

## 🎯 Decisões sobre Eventos

### 1. Granularidade

**Decisão:** Eventos granulares vs. agregados

**Escolha:** Granular (cada mudança = 1 evento)

**Razão:**

- Auditoria detalhada
- Reconstrução precisa
- Flexibilidade para projections

**Exemplo:**

```
✅ CERTO (granular)
- AppointmentScheduled
- AppointmentConfirmed
- AppointmentRescheduled

❌ ERRADO (agregado demais)
- AppointmentUpdated (genérico demais)
```

### 2. Dados no Evento

**Decisão:** Mínimo necessário para reconstruir estado

**Regra:**

- ✅ Incluir: IDs, valores novos, timestamps
- ✅ Incluir: Valores anteriores quando relevante (ex: RiskScoreRecalculated)
- ❌ Evitar: Dados calculados que podem ser derivados
- ❌ Evitar: Objetos completos de outros agregados

### 3. Imutabilidade

**Decisão:** Eventos NUNCA mudam após serem gravados

**Implicação:**

- Se schema precisa mudar → criar novo event_type
- Se dados estão errados → gerar evento de correção
- Nunca fazer UPDATE no Event Store

---

## 📚 Documentação Relacionada

- [AGGREGATES.md](./AGGREGATES.md) - Agregados e comandos
- [DATABASE.md](./DATABASE.md) - Event Store schema
- [STATE_MACHINE.md](./STATE_MACHINE.md) - Máquinas de estado (próximo)
- [PROJECTIONS.md](./PROJECTIONS.md) - Read Models (próximo)

---

## ✅ Status

- ✅ 30 tipos de eventos definidos
- ✅ Schemas JSON completos
- ✅ Campos obrigatórios/opcionais especificados
- ✅ Exemplos de payloads documentados
- ✅ Convenções de nomenclatura estabelecidas
- ⏳ Versionamento (será aplicado conforme necessário)

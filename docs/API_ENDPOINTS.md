# API Endpoints - Healz

## Visão Geral

Este documento especifica todos os endpoints da API REST do Healz, organizados por domínio e ordem de implementação.

**Convenções:**

- Todas as rotas (exceto `/auth`) requerem autenticação via JWT
- Responses seguem formato padrão com paginação quando aplicável
- Erros retornam formato consistente
- Multi-tenancy aplicado automaticamente via guards

---

## Formato Padrão de Responses

### Success Response

```typescript
{
  "data": any,           // Dados retornados
  "meta"?: {             // Metadados (opcional, para listas)
    "total": number,
    "page": number,
    "limit": number,
    "hasMore": boolean
  }
}
```

### Error Response

```typescript
{
  "statusCode": number,
  "message": string | string[],
  "error": string,
  "timestamp": string,
  "path": string
}
```

### Paginated Response

```typescript
{
  "data": any[],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "hasMore": true,
    "totalPages": 8
  }
}
```

---

## Ordem de Implementação

### Sprint 1: Autenticação (Semana 1-2)

1. ✅ POST /auth/callback
2. ✅ POST /auth/switch-context
3. ✅ GET /auth/me
4. ✅ GET /auth/available-contexts

### Sprint 2: WhatsApp Webhook (Semana 3-4)

1. ✅ POST /webhooks/whatsapp
2. ✅ GET /webhooks/whatsapp/verify

### Sprint 3: Consultas Básicas (Semana 5-6)

1. ✅ GET /patients
2. ✅ GET /patients/:id
3. ✅ GET /patients/:id/timeline
4. ✅ GET /conversations
5. ✅ GET /conversations/:id

### Sprint 4: Ações em Conversas (Semana 7-8)

1. ✅ POST /conversations/:id/escalate
2. ✅ POST /conversations/:id/assign
3. ✅ POST /conversations/:id/messages

### Sprint 5: Appointments (Semana 9-10)

1. ✅ GET /appointments
2. ✅ POST /appointments
3. ✅ PUT /appointments/:id/confirm
4. ✅ PUT /appointments/:id/cancel

### Sprint 6: Dashboard (Semana 11-12)

1. ✅ GET /dashboard/overview
2. ✅ GET /dashboard/risk
3. ✅ GET /dashboard/escalations

---

## Autenticação

### POST /auth/callback

**Propósito:** Callback do Auth0/Clerk após login

**Autenticação:** Não requerida

**Request:**

```typescript
{
  "authProviderId": "auth0|123456789",
  "email": "maria@example.com",
  "fullName": "Maria Silva",
  "phone": "+5511999999999" // opcional
}
```

**Response 200:**

```typescript
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "context": {
      "organizationId": "org-abc-123",
      "clinicId": "clinic-xyz-456",
      "role": "receptionist"
    }
  }
}
```

**Response 401:** Usuário sem organização vinculada

---

### POST /auth/switch-context

**Propósito:** Trocar contexto de clínica

**Autenticação:** JWT requerido

**Request:**

```typescript
{
  "clinicId": "clinic-new-789"
}
```

**Response 200:**

```typescript
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "context": {
      "organizationId": "org-abc-123",
      "clinicId": "clinic-new-789",
      "role": "receptionist"
    }
  }
}
```

**Response 401:** Sem acesso à clínica solicitada

---

### GET /auth/me

**Propósito:** Informações do usuário atual

**Autenticação:** JWT requerido

**Response 200:**

```typescript
{
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "maria@example.com",
    "organizationId": "org-abc-123",
    "clinicId": "clinic-xyz-456",
    "role": "receptionist",
    "permissions": [
      "appointments.view",
      "appointments.create",
      "patients.view"
    ]
  }
}
```

---

### GET /auth/available-contexts

**Propósito:** Listar clínicas disponíveis para context switching

**Autenticação:** JWT requerido

**Response 200:**

```typescript
{
  "data": [
    {
      "organizationId": "org-abc-123",
      "organizationName": "Cardio Group",
      "clinicId": "clinic-xyz-456",
      "clinicName": "Unidade Paulista",
      "role": "receptionist"
    },
    {
      "organizationId": "org-abc-123",
      "organizationName": "Cardio Group",
      "clinicId": "clinic-abc-789",
      "clinicName": "Unidade Vila Mariana",
      "role": "receptionist"
    }
  ]
}
```

---

## Webhooks

### POST /webhooks/whatsapp

**Propósito:** Receber mensagens da Evolution API

**Autenticação:** Verificação de origem (webhook secret)

**Request (exemplo Evolution API):**

```typescript
{
  "event": "messages.upsert",
  "instance": "clinic-xyz",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0123456789ABCDEF"
    },
    "message": {
      "conversation": "Oi, quero marcar consulta"
    },
    "messageTimestamp": 1738281600,
    "pushName": "Maria Silva"
  }
}
```

**Response 200:**

```typescript
{
  "data": {
    "received": true,
    "eventId": "evt-abc-123"
  }
}
```

**Processamento:**

1. Validar origem do webhook
2. Identificar/criar paciente pelo telefone
3. Criar/recuperar conversa ativa
4. Gerar evento `MessageReceived`
5. Disparar processamento assíncrono (Decision Engine)

---

### GET /webhooks/whatsapp/verify

**Propósito:** Verificação inicial do webhook (se necessário pela Evolution API)

**Autenticação:** Query params

**Query Params:**

```
hub.mode=subscribe
hub.verify_token=your-verify-token
hub.challenge=random-challenge
```

**Response 200:**

```
{challenge-value}
```

---

## Patients

### GET /patients

**Propósito:** Listar pacientes da organização

**Autenticação:** JWT + Permissions: `patients.view`

**Query Params:**

```typescript
{
  page?: number;        // default: 1
  limit?: number;       // default: 20, max: 100
  search?: string;      // Busca por nome ou telefone
  status?: 'active' | 'inactive' | 'suspended';
  sortBy?: 'name' | 'created_at' | 'last_interaction_at';
  sortOrder?: 'asc' | 'desc';
}
```

**Response 200:**

```typescript
{
  "data": [
    {
      "id": "patient-123",
      "fullName": "Maria Silva",
      "phone": "+5511999999999",
      "email": "maria@example.com",
      "status": "active",
      "lastInteractionAt": "2025-01-28T10:30:00Z",
      "createdAt": "2025-01-15T14:20:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "hasMore": true,
    "totalPages": 8
  }
}
```

---

### GET /patients/:id

**Propósito:** Detalhes completos de um paciente

**Autenticação:** JWT + Permissions: `patients.view`

**Response 200:**

```typescript
{
  "data": {
    "patient": {
      "id": "patient-123",
      "fullName": "Maria Silva",
      "phone": "+5511999999999",
      "email": "maria@example.com",
      "birthDate": "1985-03-15",
      "status": "active",
      "preferences": {
        "communicationChannel": "whatsapp",
        "reminderEnabled": true,
        "reminderTimeBefore": 1440
      },
      "createdAt": "2025-01-15T14:20:00Z",
      "lastInteractionAt": "2025-01-28T10:30:00Z"
    },
    "journey": {
      "currentStage": "scheduled",
      "riskScore": 0.15,
      "totalAppointments": 3,
      "attendedAppointments": 2,
      "noShowCount": 0
    },
    "upcomingAppointments": [
      {
        "id": "appt-456",
        "scheduledFor": "2025-02-05T14:00:00Z",
        "doctorName": "Dr. João Silva",
        "status": "confirmed"
      }
    ],
    "recentConversations": [
      {
        "id": "conv-789",
        "lastMessageAt": "2025-01-28T10:30:00Z",
        "lastMessageContent": "Consulta confirmada!",
        "status": "closed"
      }
    ]
  }
}
```

**Response 404:** Paciente não encontrado ou não pertence à organização

---

### GET /patients/:id/timeline

**Propósito:** Timeline de eventos do paciente (Event Store)

**Autenticação:** JWT + Permissions: `patients.view`

**Query Params:**

```typescript
{
  limit?: number;       // default: 50, max: 200
  before?: string;      // ISO datetime - eventos antes deste timestamp
  eventTypes?: string;  // Filtrar por tipos (comma-separated)
}
```

**Response 200:**

```typescript
{
  "data": [
    {
      "eventId": "evt-001",
      "eventType": "PatientRegistered",
      "createdAt": "2025-01-15T14:20:00Z",
      "summary": "Paciente registrado via WhatsApp",
      "details": {
        "source": "whatsapp",
        "phone": "+5511999999999"
      }
    },
    {
      "eventId": "evt-002",
      "eventType": "ConversationStarted",
      "createdAt": "2025-01-15T14:21:00Z",
      "summary": "Primeira conversa iniciada",
      "details": {
        "clinicId": "clinic-xyz-456"
      }
    },
    {
      "eventId": "evt-003",
      "eventType": "AppointmentScheduled",
      "createdAt": "2025-01-15T14:25:00Z",
      "summary": "Consulta agendada para 05/02 às 14h",
      "details": {
        "appointmentId": "appt-456",
        "doctorName": "Dr. João Silva",
        "scheduledFor": "2025-02-05T14:00:00Z"
      }
    }
  ],
  "meta": {
    "total": 12,
    "hasMore": false
  }
}
```

---

## Conversations

### GET /conversations

**Propósito:** Listar conversas (filtros para dashboard)

**Autenticação:** JWT + Permissions: `conversations.view`

**Query Params:**

```typescript
{
  page?: number;
  limit?: number;
  status?: 'initiated' | 'active' | 'awaiting_response' | 'escalated' | 'closed';
  escalated?: boolean;  // Apenas escaladas
  unassigned?: boolean; // Apenas não atribuídas
  clinicId?: string;    // Filtrar por clínica específica
}
```

**Response 200:**

```typescript
{
  "data": [
    {
      "id": "conv-123",
      "patientName": "Maria Silva",
      "patientPhone": "+5511999999999",
      "status": "escalated",
      "lastMessageAt": "2025-01-28T10:30:00Z",
      "lastMessageContent": "Preciso remarcar urgente",
      "escalatedAt": "2025-01-28T10:31:00Z",
      "escalationReason": "complex_query",
      "assignedAgentId": null,
      "messageCount": 8
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

---

### GET /conversations/:id

**Propósito:** Detalhes da conversa + mensagens

**Autenticação:** JWT + Permissions: `conversations.view`

**Query Params:**

```typescript
{
  includeMessages?: boolean;  // default: true
  messageLimit?: number;      // default: 50
}
```

**Response 200:**

```typescript
{
  "data": {
    "conversation": {
      "id": "conv-123",
      "patientId": "patient-456",
      "patientName": "Maria Silva",
      "patientPhone": "+5511999999999",
      "clinicId": "clinic-xyz-456",
      "status": "escalated",
      "startedAt": "2025-01-28T10:00:00Z",
      "escalatedAt": "2025-01-28T10:31:00Z",
      "assignedAgentId": null,
      "detectedIntent": "reschedule_appointment",
      "intentConfidence": 0.72
    },
    "messages": [
      {
        "id": "msg-001",
        "direction": "inbound",
        "content": "Oi, bom dia!",
        "sender": "patient",
        "timestamp": "2025-01-28T10:00:00Z"
      },
      {
        "id": "msg-002",
        "direction": "outbound",
        "content": "Olá Maria! Como posso ajudar?",
        "sender": "bot",
        "timestamp": "2025-01-28T10:00:15Z"
      },
      {
        "id": "msg-003",
        "direction": "inbound",
        "content": "Preciso remarcar minha consulta urgente",
        "sender": "patient",
        "timestamp": "2025-01-28T10:30:00Z"
      }
    ]
  }
}
```

---

### POST /conversations/:id/escalate

**Propósito:** Escalar conversa manualmente

**Autenticação:** JWT + Permissions: `conversations.escalate`

**Request:**

```typescript
{
  "reason": "patient_complaint" | "complex_query" | "explicit_request",
  "notes"?: string
}
```

**Response 200:**

```typescript
{
  "data": {
    "conversationId": "conv-123",
    "escalatedAt": "2025-01-28T10:35:00Z",
    "eventId": "evt-abc-123"
  }
}
```

---

### POST /conversations/:id/assign

**Propósito:** Atribuir agente à conversa escalada

**Autenticação:** JWT + Permissions: `conversations.assign`

**Request:**

```typescript
{
  "agentId": "user-789"
}
```

**Response 200:**

```typescript
{
  "data": {
    "conversationId": "conv-123",
    "assignedAgentId": "user-789",
    "assignedAt": "2025-01-28T10:40:00Z"
  }
}
```

**Response 400:** Agente não tem permissão para clínica

---

### POST /conversations/:id/messages

**Propósito:** Enviar mensagem manual (agente)

**Autenticação:** JWT + Permissions: `conversations.reply`

**Request:**

```typescript
{
  "content": "Claro! Vou verificar as datas disponíveis.",
  "mediaType"?: "text" | "image" | "document",
  "mediaUrl"?: string  // Se mediaType != text
}
```

**Response 200:**

```typescript
{
  "data": {
    "messageId": "msg-new-123",
    "conversationId": "conv-123",
    "sentAt": "2025-01-28T10:45:00Z",
    "deliveryStatus": "sent"  // sent, delivered, read, failed
  }
}
```

---

## Appointments

### GET /appointments

**Propósito:** Listar agendamentos

**Autenticação:** JWT + Permissions: `appointments.view`

**Query Params:**

```typescript
{
  page?: number;
  limit?: number;
  doctorId?: string;
  patientId?: string;
  clinicId?: string;
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';
  dateFrom?: string;    // ISO date
  dateTo?: string;      // ISO date
  sortBy?: 'scheduled_for' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}
```

**Response 200:**

```typescript
{
  "data": [
    {
      "id": "appt-123",
      "patientName": "Maria Silva",
      "patientPhone": "+5511999999999",
      "doctorName": "Dr. João Silva",
      "scheduledFor": "2025-02-05T14:00:00Z",
      "duration": 30,
      "status": "confirmed",
      "appointmentType": "follow_up",
      "confirmedAt": "2025-02-04T10:00:00Z",
      "createdAt": "2025-01-28T10:25:00Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

---

### POST /appointments

**Propósito:** Criar agendamento manual

**Autenticação:** JWT + Permissions: `appointments.create`

**Request:**

```typescript
{
  "patientId": "patient-456",
  "doctorId": "doctor-789",
  "scheduledFor": "2025-02-10T15:00:00Z",
  "duration": 30,  // minutos
  "appointmentType": "first_visit" | "follow_up" | "return" | "emergency",
  "notes"?: string
}
```

**Response 201:**

```typescript
{
  "data": {
    "id": "appt-new-456",
    "patientId": "patient-456",
    "doctorId": "doctor-789",
    "scheduledFor": "2025-02-10T15:00:00Z",
    "status": "scheduled",
    "eventId": "evt-xyz-789",
    "createdAt": "2025-01-28T11:00:00Z"
  }
}
```

**Response 400:** Conflito de horário (médico ocupado)

**Response 400:** Paciente já tem agendamento no mesmo horário

**Validações:**

- Horário dentro do expediente da clínica
- Médico disponível no horário
- Paciente não tem conflito
- Não pode agendar no passado

---

### PUT /appointments/:id/confirm

**Propósito:** Confirmar agendamento

**Autenticação:** JWT + Permissions: `appointments.confirm`

**Request:**

```typescript
{
  "confirmationMethod": "whatsapp" | "phone" | "in_person"
}
```

**Response 200:**

```typescript
{
  "data": {
    "id": "appt-123",
    "status": "confirmed",
    "confirmedAt": "2025-01-28T11:05:00Z",
    "eventId": "evt-confirm-123"
  }
}
```

**Response 400:** Agendamento não pode ser confirmado (status inválido)

---

### PUT /appointments/:id/cancel

**Propósito:** Cancelar agendamento

**Autenticação:** JWT + Permissions: `appointments.cancel`

**Request:**

```typescript
{
  "reason": string,
  "cancelledBy": "patient" | "agent" | "doctor"
}
```

**Response 200:**

```typescript
{
  "data": {
    "id": "appt-123",
    "status": "cancelled",
    "cancelledAt": "2025-01-28T11:10:00Z",
    "eventId": "evt-cancel-456"
  }
}
```

---

### PUT /appointments/:id/reschedule

**Propósito:** Remarcar agendamento

**Autenticação:** JWT + Permissions: `appointments.update`

**Request:**

```typescript
{
  "newScheduledFor": "2025-02-12T16:00:00Z",
  "reason"?: string
}
```

**Response 200:**

```typescript
{
  "data": {
    "id": "appt-123",
    "status": "scheduled",
    "scheduledFor": "2025-02-12T16:00:00Z",
    "rescheduledAt": "2025-01-28T11:15:00Z",
    "eventId": "evt-reschedule-789"
  }
}
```

**Response 400:** Novo horário tem conflito

---

## Dashboard

### GET /dashboard/overview

**Propósito:** Overview geral da clínica

**Autenticação:** JWT + Permissions: `dashboard.view`

**Query Params:**

```typescript
{
  clinicId?: string;  // Se não informado, usa do contexto
  period?: 'today' | 'week' | 'month';
}
```

**Response 200:**

```typescript
{
  "data": {
    "patients": {
      "total": 1250,
      "active": 980,
      "atRisk": 45
    },
    "conversations": {
      "active": 12,
      "escalated": 3,
      "awaitingResponse": 8
    },
    "appointments": {
      "today": 15,
      "thisWeek": 87,
      "pending": 23,
      "confirmedToday": 12
    },
    "journey": {
      "avgRiskScore": 0.23,
      "highRiskCount": 15,
      "recoveredThisWeek": 8
    }
  }
}
```

---

### GET /dashboard/risk

**Propósito:** Lista de pacientes em risco

**Autenticação:** JWT + Permissions: `dashboard.view`

**Query Params:**

```typescript
{
  page?: number;
  limit?: number;
  minRiskScore?: number;  // default: 0.7
  sortBy?: 'risk_score' | 'last_interaction_at';
}
```

**Response 200:**

```typescript
{
  "data": [
    {
      "journeyId": "journey-123",
      "patientName": "Carlos Silva",
      "patientPhone": "+5511988888888",
      "currentStage": "at_risk",
      "riskScore": 0.85,
      "riskIndicators": [
        {
          "type": "silence",
          "severity": "high",
          "value": 0.9,
          "metadata": {
            "daysSinceLastInteraction": 21
          }
        },
        {
          "type": "no_show",
          "severity": "medium",
          "value": 0.6
        }
      ],
      "lastInteractionAt": "2025-01-07T14:00:00Z",
      "escalatedTo": null
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET /dashboard/escalations

**Propósito:** Conversas escaladas pendentes

**Autenticação:** JWT + Permissions: `dashboard.view`

**Response 200:**

```typescript
{
  "data": [
    {
      "conversationId": "conv-456",
      "patientName": "Ana Costa",
      "patientPhone": "+5511977777777",
      "escalatedAt": "2025-01-28T09:30:00Z",
      "escalationReason": "patient_complaint",
      "assignedAgentId": null,
      "lastMessageAt": "2025-01-28T09:29:00Z",
      "lastMessageContent": "Estou muito insatisfeita com o atendimento",
      "priority": "high"
    }
  ],
  "meta": {
    "total": 3
  }
}
```

---

## Permissões por Endpoint

| Endpoint                         | Permissão              |
| -------------------------------- | ---------------------- |
| GET /patients                    | patients.view          |
| GET /patients/:id                | patients.view          |
| GET /patients/:id/timeline       | patients.view          |
| GET /conversations               | conversations.view     |
| GET /conversations/:id           | conversations.view     |
| POST /conversations/:id/escalate | conversations.escalate |
| POST /conversations/:id/assign   | conversations.assign   |
| POST /conversations/:id/messages | conversations.reply    |
| GET /appointments                | appointments.view      |
| POST /appointments               | appointments.create    |
| PUT /appointments/:id/confirm    | appointments.confirm   |
| PUT /appointments/:id/cancel     | appointments.cancel    |
| PUT /appointments/:id/reschedule | appointments.update    |
| GET /dashboard/\*                | dashboard.view         |

---

## Rate Limiting

```typescript
// Global rate limit
@Throttle(100, 60)  // 100 requests por minuto

// Endpoint específico
@Throttle(10, 60)   // POST /appointments - 10 por minuto
```

---

## Validação de Requests

### Exemplo de DTO

```typescript
// src/appointments/dto/create-appointment.dto.ts
import {
  IsUUID,
  IsDateString,
  IsInt,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  Max,
} from "class-validator";

export class CreateAppointmentDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  doctorId: string;

  @IsDateString()
  scheduledFor: string;

  @IsInt()
  @Min(15)
  @Max(120)
  duration: number;

  @IsEnum(["first_visit", "follow_up", "return", "emergency"])
  appointmentType: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
```

---

## Headers Requeridos

```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
X-Request-ID: {uuid}  // Opcional, para tracking
```

---

## Próximos Endpoints (Futuro)

### Admin

- POST /organizations (criar org)
- POST /clinics (criar clínica)
- POST /users (criar usuário)
- PUT /users/:id/roles (atribuir roles)

### Relatórios

- GET /reports/retention
- GET /reports/appointments
- GET /reports/patient-journey

### Configurações

- GET /settings/clinic
- PUT /settings/clinic
- GET /settings/whatsapp
- PUT /settings/whatsapp

---

## Documentação Relacionada

- [AUTHENTICATION.md](./AUTHENTICATION.md) - Autenticação e JWT
- [DRIZZLE_SCHEMA.md](./DRIZZLE_SCHEMA.md) - Schema do banco
- [EVENTS.md](../EVENTS.md) - Catálogo de eventos

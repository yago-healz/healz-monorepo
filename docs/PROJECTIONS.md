# Read Models e Projections - Healz

## Visão Geral

Este documento especifica os **Read Models (Projections)** do Healz - views materializadas otimizadas para consultas rápidas, construídas a partir dos eventos do Event Store.

**Princípio fundamental:** O Event Store é a fonte da verdade. Projections são **cache desnormalizados** que podem ser reconstruídos a qualquer momento a partir dos eventos.

Para entender os eventos que alimentam estas projections, veja [EVENTS.md](./EVENTS.md).
Para entender a arquitetura, veja [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Por que Projections?

### Problema: Event Store Não é Otimizado para Queries

```typescript
// ❌ LENTO - Reconstruir estado a cada query
const events = await eventStore.getByAggregateId('patient-123');
const patient = Patient.fromHistory(events);
```

### Solução: Projections Materializadas

```typescript
// ✅ RÁPIDO - Ler de view materializada
const patient = await patientView.findById('patient-123');
```

### Vantagens

- **Performance:** Queries otimizadas com índices adequados
- **Simplicidade:** Estrutura desnormalizada para facilitar leitura
- **Escalabilidade:** Separação de leitura e escrita (CQRS)
- **Flexibilidade:** Múltiplas views para diferentes necessidades

---

## Estratégias de Sincronização

### 1. Event Subscribers (Recomendado)

Projections são atualizadas **automaticamente** via event bus.

```typescript
eventBus.on('PatientRegistered', async (event) => {
  await patientView.insert({
    id: event.data.patient_id,
    organization_id: event.data.organization_id,
    phone: event.data.phone,
    full_name: event.data.full_name,
    status: 'active',
    created_at: event.created_at,
    updated_at: event.created_at
  });
});

eventBus.on('PatientContactUpdated', async (event) => {
  await patientView.update(event.data.patient_id, {
    phone: event.data.new_phone,
    email: event.data.new_email,
    updated_at: event.created_at
  });
});
```

### 2. Rebuild from Scratch

Útil para:
- Deployment de nova projection
- Corrigir inconsistências
- Alterar schema de projection

```typescript
async function rebuildPatientView() {
  await patientView.truncate();

  const events = await eventStore.getByAggregateType('Patient');

  for (const event of events) {
    await applyEventToProjection(event, patientView);
  }
}
```

### 3. Consistency Model

**Decisão:** **Consistência Eventual**

- Write (Command) retorna sucesso após gravar no Event Store
- Projection é atualizada **assincronamente** (milissegundos depois)
- UI deve lidar com pequena latência (otimistic updates)

---

## Projections Principais

---

## 1️⃣ PatientView

### Propósito

View consolidada do **estado atual do paciente**.

### Schema

```typescript
table patients_view {
  id: UUID PRIMARY KEY
  organization_id: UUID NOT NULL
  phone: STRING NOT NULL
  full_name: STRING NOT NULL
  email: STRING | null
  birth_date: DATE | null
  cpf: STRING | null
  status: ENUM('active', 'inactive', 'suspended') NOT NULL
  registration_source: ENUM('whatsapp', 'manual', 'import')

  // Preferências
  preferred_communication_channel: ENUM('whatsapp', 'sms', 'email')
  reminder_enabled: BOOLEAN DEFAULT true
  reminder_time_before: INTEGER DEFAULT 1440 // minutos

  // Metadados
  created_at: TIMESTAMPTZ NOT NULL
  updated_at: TIMESTAMPTZ NOT NULL
  last_interaction_at: TIMESTAMPTZ | null

  // Índices
  INDEX idx_patients_org_phone (organization_id, phone)
  INDEX idx_patients_status (status)
  INDEX idx_patients_created (created_at DESC)

  // RLS
  RLS POLICY tenant_isolation USING (organization_id = current_tenant_id())
}
```

### Eventos que Atualizam

| Evento                         | Operação | Campos Afetados                  |
| ------------------------------ | -------- | -------------------------------- |
| `PatientRegistered`            | INSERT   | Todos os campos iniciais         |
| `PatientContactUpdated`        | UPDATE   | phone, email                     |
| `PatientPreferencesUpdated`    | UPDATE   | preferred_channel, reminder_*    |
| `PatientStatusChanged`         | UPDATE   | status                           |
| `MessageReceived`              | UPDATE   | last_interaction_at              |
| `AppointmentScheduled`         | UPDATE   | last_interaction_at              |

### Queries Suportadas

```typescript
// Listar pacientes ativos de uma organização
SELECT * FROM patients_view
WHERE organization_id = $1
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 50;

// Buscar paciente por telefone
SELECT * FROM patients_view
WHERE organization_id = $1
  AND phone = $2;

// Pacientes sem interação há 30+ dias
SELECT * FROM patients_view
WHERE organization_id = $1
  AND last_interaction_at < NOW() - INTERVAL '30 days'
  AND status = 'active';
```

---

## 2️⃣ ConversationView

### Propósito

View de **conversas ativas** para dashboard de atendentes.

### Schema

```typescript
table conversations_view {
  id: UUID PRIMARY KEY
  patient_id: UUID NOT NULL
  clinic_id: UUID NOT NULL
  status: ENUM('initiated', 'active', 'awaiting_response', 'escalated', 'closed')

  // Mensagem mais recente
  last_message_content: STRING | null
  last_message_at: TIMESTAMPTZ | null
  last_message_from: ENUM('patient', 'bot', 'agent')

  // Escalação
  escalated_at: TIMESTAMPTZ | null
  escalation_reason: STRING | null
  assigned_agent_id: UUID | null

  // Intenção detectada
  detected_intent: STRING | null
  intent_confidence: FLOAT | null

  // Contadores
  message_count: INTEGER DEFAULT 0
  bot_message_count: INTEGER DEFAULT 0

  // Metadados
  started_at: TIMESTAMPTZ NOT NULL
  closed_at: TIMESTAMPTZ | null

  // Relacionamentos (desnormalizados)
  patient_name: STRING
  patient_phone: STRING

  // Índices
  INDEX idx_conv_clinic_status (clinic_id, status)
  INDEX idx_conv_escalated (status, escalated_at) WHERE status = 'escalated'
  INDEX idx_conv_last_message (last_message_at DESC)

  // RLS
  RLS POLICY clinic_access USING (clinic_id IN (SELECT clinic_id FROM user_clinics WHERE user_id = current_user_id()))
}
```

### Eventos que Atualizam

| Evento                  | Operação | Campos Afetados                         |
| ----------------------- | -------- | --------------------------------------- |
| `ConversationStarted`   | INSERT   | Todos os campos iniciais                |
| `MessageReceived`       | UPDATE   | last_message_*, message_count           |
| `MessageSent`           | UPDATE   | last_message_*, bot_message_count       |
| `IntentDetected`        | UPDATE   | detected_intent, intent_confidence      |
| `ConversationEscalated` | UPDATE   | status='escalated', escalated_at        |
| `AgentAssigned`         | UPDATE   | assigned_agent_id                       |
| `ConversationClosed`    | UPDATE   | status='closed', closed_at              |

### Queries Suportadas

```typescript
// Dashboard de atendentes - conversas escaladas
SELECT * FROM conversations_view
WHERE clinic_id = $1
  AND status = 'escalated'
  AND assigned_agent_id IS NULL
ORDER BY escalated_at ASC;

// Conversas aguardando resposta há mais de 1h
SELECT * FROM conversations_view
WHERE clinic_id = $1
  AND status = 'awaiting_response'
  AND last_message_at < NOW() - INTERVAL '1 hour';

// Histórico de conversa de um paciente
SELECT * FROM conversations_view
WHERE patient_id = $1
ORDER BY started_at DESC;
```

---

## 3️⃣ AppointmentView

### Propósito

View de **agendamentos** para calendário e listagens.

### Schema

```typescript
table appointments_view {
  id: UUID PRIMARY KEY
  patient_id: UUID NOT NULL
  clinic_id: UUID NOT NULL
  doctor_id: UUID NOT NULL
  scheduled_for: TIMESTAMPTZ NOT NULL
  duration: INTEGER NOT NULL // minutos

  status: ENUM('scheduled', 'confirmed', 'rescheduled', 'cancelled', 'no_show', 'completed')
  appointment_type: ENUM('first_visit', 'follow_up', 'return', 'emergency')

  // Confirmação
  confirmed_at: TIMESTAMPTZ | null
  confirmation_method: ENUM('whatsapp', 'phone', 'in_person') | null
  confirmation_count: INTEGER DEFAULT 0

  // Reminders
  reminder_sent_at: TIMESTAMPTZ | null
  reminder_delivery_status: ENUM('sent', 'delivered', 'read', 'failed') | null

  // Notas
  notes: TEXT | null

  // Desnormalizado para queries
  patient_name: STRING
  patient_phone: STRING
  doctor_name: STRING

  // Metadados
  scheduled_by: ENUM('patient', 'agent', 'doctor')
  created_at: TIMESTAMPTZ NOT NULL
  updated_at: TIMESTAMPTZ NOT NULL

  // Índices
  INDEX idx_appt_doctor_date (doctor_id, scheduled_for)
  INDEX idx_appt_patient_date (patient_id, scheduled_for DESC)
  INDEX idx_appt_clinic_date (clinic_id, scheduled_for)
  INDEX idx_appt_status_date (status, scheduled_for)

  // RLS
  RLS POLICY clinic_access USING (clinic_id IN (SELECT clinic_id FROM user_clinics WHERE user_id = current_user_id()))
}
```

### Eventos que Atualizam

| Evento                       | Operação | Campos Afetados                    |
| ---------------------------- | -------- | ---------------------------------- |
| `AppointmentScheduled`       | INSERT   | Todos os campos iniciais           |
| `AppointmentConfirmed`       | UPDATE   | confirmed_at, confirmation_*       |
| `AppointmentRescheduled`     | UPDATE   | scheduled_for, status              |
| `AppointmentCancelled`       | UPDATE   | status='cancelled'                 |
| `AppointmentMarkedAsNoShow`  | UPDATE   | status='no_show'                   |
| `AppointmentCompleted`       | UPDATE   | status='completed', notes          |
| `AppointmentReminderSent`    | UPDATE   | reminder_sent_at, delivery_status  |

### Queries Suportadas

```typescript
// Calendário do médico (dia específico)
SELECT * FROM appointments_view
WHERE doctor_id = $1
  AND DATE(scheduled_for) = $2
  AND status NOT IN ('cancelled', 'completed')
ORDER BY scheduled_for ASC;

// Próximas consultas do paciente
SELECT * FROM appointments_view
WHERE patient_id = $1
  AND scheduled_for > NOW()
  AND status IN ('scheduled', 'confirmed')
ORDER BY scheduled_for ASC;

// Consultas não confirmadas (24h antes)
SELECT * FROM appointments_view
WHERE clinic_id = $1
  AND scheduled_for BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
  AND status = 'scheduled'
  AND confirmed_at IS NULL;
```

---

## 4️⃣ JourneyView

### Propósito

View do **estado atual da jornada** do paciente.

### Schema

```typescript
table journey_view {
  id: UUID PRIMARY KEY
  patient_id: UUID NOT NULL
  clinic_id: UUID NOT NULL

  // Estado atual
  current_stage: ENUM('initiated', 'first_contact', 'scheduled', 'confirmed',
                      'attended', 'follow_up', 'returned', 'at_risk',
                      'no_show', 'recovered', 'abandoned', 'completed')
  stage_entered_at: TIMESTAMPTZ NOT NULL

  // Risk scoring
  risk_score: FLOAT DEFAULT 0.0
  risk_indicators: JSONB DEFAULT '[]'
  last_risk_calculation_at: TIMESTAMPTZ | null

  // Métricas
  total_appointments: INTEGER DEFAULT 0
  attended_appointments: INTEGER DEFAULT 0
  no_show_count: INTEGER DEFAULT 0
  cancellation_count: INTEGER DEFAULT 0

  // Interações
  total_messages: INTEGER DEFAULT 0
  last_interaction_at: TIMESTAMPTZ | null
  days_since_last_interaction: INTEGER | null // computed

  // Escalação
  escalated_to: UUID | null
  escalated_at: TIMESTAMPTZ | null
  escalation_reason: TEXT | null

  // Metadados
  started_at: TIMESTAMPTZ NOT NULL
  completed_at: TIMESTAMPTZ | null

  // Desnormalizado
  patient_name: STRING
  patient_phone: STRING

  // Índices
  INDEX idx_journey_patient_clinic (patient_id, clinic_id)
  INDEX idx_journey_stage (current_stage)
  INDEX idx_journey_risk (risk_score DESC)
  INDEX idx_journey_at_risk (current_stage, risk_score) WHERE current_stage = 'at_risk'
  INDEX idx_journey_last_interaction (last_interaction_at)

  // RLS
  RLS POLICY clinic_access USING (clinic_id IN (SELECT clinic_id FROM user_clinics WHERE user_id = current_user_id()))
}
```

### Eventos que Atualizam

| Evento                     | Operação | Campos Afetados                         |
| -------------------------- | -------- | --------------------------------------- |
| `JourneyStarted`           | INSERT   | Todos os campos iniciais                |
| `JourneyStageChanged`      | UPDATE   | current_stage, stage_entered_at         |
| `RiskDetected`             | UPDATE   | risk_indicators (append)                |
| `RiskScoreRecalculated`    | UPDATE   | risk_score, last_risk_calculation_at    |
| `RiskEscalated`            | UPDATE   | escalated_to, escalated_at              |
| `MessageReceived`          | UPDATE   | total_messages++, last_interaction_at   |
| `AppointmentScheduled`     | UPDATE   | total_appointments++                    |
| `AppointmentCompleted`     | UPDATE   | attended_appointments++                 |
| `AppointmentMarkedAsNoShow`| UPDATE   | no_show_count++                         |
| `JourneyCompleted`         | UPDATE   | current_stage='completed', completed_at |

### Queries Suportadas

```typescript
// Dashboard de risco - pacientes em risco alto
SELECT * FROM journey_view
WHERE clinic_id = $1
  AND current_stage = 'at_risk'
  AND risk_score > 0.7
ORDER BY risk_score DESC;

// Pacientes silenciosos (14+ dias)
SELECT * FROM journey_view
WHERE clinic_id = $1
  AND current_stage IN ('first_contact', 'scheduled', 'follow_up')
  AND last_interaction_at < NOW() - INTERVAL '14 days';

// Estatísticas da jornada
SELECT
  current_stage,
  COUNT(*) as total,
  AVG(risk_score) as avg_risk
FROM journey_view
WHERE clinic_id = $1
GROUP BY current_stage;
```

---

## 5️⃣ RiskDashboardView

### Propósito

View **agregada** para dashboard de gestão de riscos.

### Schema

```typescript
table risk_dashboard_view {
  id: UUID PRIMARY KEY
  clinic_id: UUID NOT NULL
  patient_id: UUID NOT NULL
  journey_id: UUID NOT NULL

  // Classificação de risco
  risk_level: ENUM('low', 'medium', 'high', 'critical')
  risk_score: FLOAT NOT NULL

  // Principais indicadores (desnormalizado)
  silence_days: INTEGER | null
  no_show_count: INTEGER DEFAULT 0
  cancellation_count: INTEGER DEFAULT 0
  last_negative_sentiment_at: TIMESTAMPTZ | null

  // Ações tomadas
  proactive_message_sent_at: TIMESTAMPTZ | null
  escalated_to_human: BOOLEAN DEFAULT false
  escalated_at: TIMESTAMPTZ | null

  // Paciente (desnormalizado)
  patient_name: STRING
  patient_phone: STRING
  current_stage: STRING

  // Prioritização
  priority_score: FLOAT // risk_score * urgency_factor

  // Metadados
  detected_at: TIMESTAMPTZ NOT NULL
  updated_at: TIMESTAMPTZ NOT NULL

  // Índices
  INDEX idx_risk_clinic_level (clinic_id, risk_level)
  INDEX idx_risk_priority (priority_score DESC)
  INDEX idx_risk_escalated (escalated_to_human, escalated_at)

  // RLS
  RLS POLICY clinic_access USING (clinic_id IN (SELECT clinic_id FROM user_clinics WHERE user_id = current_user_id()))
}
```

### Queries Suportadas

```typescript
// Dashboard principal de risco
SELECT * FROM risk_dashboard_view
WHERE clinic_id = $1
  AND risk_level IN ('high', 'critical')
  AND escalated_to_human = false
ORDER BY priority_score DESC
LIMIT 20;

// Distribuição de risco
SELECT
  risk_level,
  COUNT(*) as count
FROM risk_dashboard_view
WHERE clinic_id = $1
GROUP BY risk_level;
```

---

## 6️⃣ AnalyticsViews

### PatientRetentionMetrics

View agregada por período (dia/semana/mês).

```typescript
table patient_retention_metrics {
  id: UUID PRIMARY KEY
  clinic_id: UUID NOT NULL
  period_type: ENUM('day', 'week', 'month')
  period_start: DATE NOT NULL

  // Métricas de jornada
  new_patients: INTEGER DEFAULT 0
  active_journeys: INTEGER DEFAULT 0
  completed_journeys: INTEGER DEFAULT 0
  abandoned_journeys: INTEGER DEFAULT 0

  // Taxas
  retention_rate: FLOAT // completed / (completed + abandoned)
  abandonment_rate: FLOAT

  // Tempo médio
  avg_journey_duration_days: FLOAT
  avg_time_to_first_appointment_days: FLOAT

  // Risco
  avg_risk_score: FLOAT
  high_risk_count: INTEGER DEFAULT 0

  UNIQUE (clinic_id, period_type, period_start)
  INDEX idx_metrics_clinic_period (clinic_id, period_type, period_start DESC)
}
```

### AppointmentMetrics

```typescript
table appointment_metrics {
  id: UUID PRIMARY KEY
  clinic_id: UUID NOT NULL
  doctor_id: UUID | null
  period_type: ENUM('day', 'week', 'month')
  period_start: DATE NOT NULL

  // Contadores
  total_scheduled: INTEGER DEFAULT 0
  total_confirmed: INTEGER DEFAULT 0
  total_completed: INTEGER DEFAULT 0
  total_no_show: INTEGER DEFAULT 0
  total_cancelled: INTEGER DEFAULT 0

  // Taxas
  confirmation_rate: FLOAT // confirmed / scheduled
  attendance_rate: FLOAT // completed / (confirmed || scheduled)
  no_show_rate: FLOAT

  UNIQUE (clinic_id, doctor_id, period_type, period_start)
  INDEX idx_appt_metrics_clinic (clinic_id, period_type, period_start DESC)
}
```

---

## Estratégia de Atualização

### Event Handlers

```typescript
// Patient View Handler
class PatientViewHandler {
  @OnEvent('PatientRegistered')
  async handlePatientRegistered(event: DomainEvent) {
    await this.db.insert(patients_view).values({
      id: event.data.patient_id,
      organization_id: event.data.organization_id,
      phone: event.data.phone,
      full_name: event.data.full_name,
      email: event.data.email,
      status: 'active',
      registration_source: event.data.registration_source,
      created_at: event.created_at,
      updated_at: event.created_at,
    });
  }

  @OnEvent('PatientContactUpdated')
  async handleContactUpdated(event: DomainEvent) {
    await this.db
      .update(patients_view)
      .set({
        phone: event.data.new_phone,
        email: event.data.new_email,
        updated_at: event.created_at,
      })
      .where(eq(patients_view.id, event.data.patient_id));
  }
}
```

### Rebuild Script

```typescript
async function rebuildAllProjections() {
  console.log('Starting projection rebuild...');

  // Truncate all projection tables
  await db.truncate([
    patients_view,
    conversations_view,
    appointments_view,
    journey_view,
    risk_dashboard_view,
  ]);

  // Get all events ordered by created_at
  const events = await eventStore.getAllEvents({
    orderBy: 'created_at ASC'
  });

  console.log(`Processing ${events.length} events...`);

  // Apply each event to appropriate projections
  for (const event of events) {
    await eventBus.emit(event.event_type, event);
  }

  // Rebuild analytics (aggregations)
  await rebuildAnalyticsViews();

  console.log('Rebuild complete!');
}
```

---

## Performance e Otimizações

### 1. Índices Estratégicos

**Regra:** Índice para cada query comum

```sql
-- PatientView
CREATE INDEX idx_patients_org_phone ON patients_view(organization_id, phone);
CREATE INDEX idx_patients_last_interaction ON patients_view(last_interaction_at)
  WHERE status = 'active';

-- JourneyView
CREATE INDEX idx_journey_risk_escalated ON journey_view(clinic_id, risk_score DESC)
  WHERE current_stage = 'at_risk' AND escalated_to IS NULL;
```

### 2. Partial Indexes

Índices apenas para subconjuntos relevantes:

```sql
-- Apenas conversas escaladas não atribuídas
CREATE INDEX idx_conv_escalated_unassigned ON conversations_view(clinic_id, escalated_at)
WHERE status = 'escalated' AND assigned_agent_id IS NULL;
```

### 3. Materialized Views com Refresh

Para analytics que não precisam de real-time:

```sql
-- Refresh a cada 1 hora
CREATE MATERIALIZED VIEW patient_retention_daily AS
SELECT
  clinic_id,
  DATE(created_at) as date,
  COUNT(*) as new_patients,
  COUNT(*) FILTER (WHERE status = 'active') as active_patients
FROM patients_view
GROUP BY clinic_id, DATE(created_at);

-- Refresh automático via cron
REFRESH MATERIALIZED VIEW CONCURRENTLY patient_retention_daily;
```

### 4. Desnormalização Estratégica

**Decisão:** Incluir dados de paciente nas projections relacionadas

```typescript
// ✅ CERTO - Desnormalizado
table appointments_view {
  patient_name: STRING // desnormalizado
  patient_phone: STRING // desnormalizado
}

// ❌ ERRADO - Normalizado (requer JOIN)
table appointments_view {
  patient_id: UUID // precisa JOIN com patients_view
}
```

**Quando desnormalizar:**
- Dados raramente mudam (nome, telefone inicial)
- Query muito frequente
- JOIN caro

**Trade-off:**
- Mais espaço em disco
- Inconsistência temporária (eventual consistency)
- Maior complexidade no rebuild

---

## Consistência Eventual

### Cenário Comum

```
T0: Comando "ScheduleAppointment" processado
T0: Event "AppointmentScheduled" gravado no Event Store
T0: Comando retorna sucesso ao cliente
T1: Event bus processa evento (async)
T1: AppointmentView atualizada
```

**Latência típica:** 10-100ms

### Lidando na UI

```typescript
// Otimistic Update
function scheduleAppointment(data) {
  // 1. Mostra na UI imediatamente (otimista)
  const optimisticAppointment = {
    id: generateTempId(),
    ...data,
    status: 'scheduled',
    isPending: true
  };

  updateUIOptimistically(optimisticAppointment);

  // 2. Envia comando
  const result = await api.scheduleAppointment(data);

  // 3. Substitui ID temporário por ID real
  replaceOptimisticWithReal(optimisticAppointment.id, result.id);

  // 4. Poll ou WebSocket para garantir sincronização
  await waitForProjectionUpdate(result.id);
}
```

---

## Monitoramento e Alertas

### Métricas Importantes

```typescript
// Lag das projections
SELECT
  'appointments_view' as projection,
  MAX(updated_at) as last_update,
  NOW() - MAX(updated_at) as lag
FROM appointments_view;

// Eventos não processados
SELECT COUNT(*) as unprocessed
FROM events e
LEFT JOIN projection_checkpoints pc ON pc.last_event_id >= e.id
WHERE pc.last_event_id IS NULL;
```

### Alertas

```yaml
# Alert: Projection Lag > 1 minuto
- alert: ProjectionLag
  expr: projection_lag_seconds > 60
  annotations:
    summary: "Projection {{ $labels.projection }} lagging behind"

# Alert: Rebuild necessário
- alert: ProjectionInconsistency
  expr: projection_consistency_errors > 10
  annotations:
    summary: "Projection {{ $labels.projection }} needs rebuild"
```

---

## Questões em Aberto

### 1. Snapshot Strategy

**Questão:** Quando usar snapshots para acelerar rebuild?

**Contexto:** Rebuild completo pode levar horas com milhões de eventos

**Opções:**
- Snapshot semanal de todas as projections
- Snapshot incremental apenas de agregados grandes
- Usar particionamento temporal do Event Store

### 2. Multi-Region Replication

**Questão:** Como replicar projections entre regiões?

**Contexto:** Event Store pode estar em região diferente

**Opções:**
- Replicação do PostgreSQL (streaming replication)
- Rebuild local em cada região
- Cache distribuído (Redis Cluster)

### 3. Analytics Views Refresh Rate

**Questão:** Com que frequência atualizar analytics?

**Atual:** Algumas views podem ter refresh manual/horário

**Considerar:** Real-time vs custo computacional

---

## Próximos Passos

1. ✅ Projections principais definidas
2. ✅ Estratégia de sincronização especificada
3. ⏳ Implementar event handlers
4. ⏳ Implementar rebuild scripts
5. ⏳ Criar índices otimizados
6. ⏳ Setup de monitoramento de lag
7. ⏳ Testes de performance com volume realista

---

## Documentação Relacionada

- [EVENTS.md](./EVENTS.md) - Catálogo de eventos
- [AGGREGATES.md](./AGGREGATES.md) - Agregados do sistema
- [DATABASE.md](./DATABASE.md) - Event Store
- [STATE_MACHINE.md](./STATE_MACHINE.md) - Máquina de estados
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura geral

---

## Status

- ✅ 6 projections principais definidas
- ✅ Schemas detalhados
- ✅ Queries de exemplo documentadas
- ✅ Estratégia de sincronização definida
- ✅ Otimizações de performance especificadas
- ✅ Consistência eventual explicada

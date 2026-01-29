# STATE_MACHINE.md - Healz

## Visão Geral

Este documento especifica a **Máquina de Estados da Jornada do Paciente** (PatientJourney), o componente mais estratégico do Healz. A máquina de estados processa eventos do sistema e gerencia transições automáticas entre estágios, detectando riscos e disparando ações proativas.

Para entender os eventos que alimentam esta máquina, veja [EVENTS.md](./EVENTS.md).  
Para entender o agregado PatientJourney, veja [AGGREGATES.md](./AGGREGATES.md).

---

## Princípios Fundamentais

### 1. Event-Driven

A State Machine **reage a eventos**, nunca requer input manual para transições.

```typescript
// ✅ CERTO - Transição automática via evento
eventBus.on("AppointmentScheduled", (event) => {
  journey.advanceStage("scheduled");
});

// ❌ ERRADO - Transição manual
journey.setStage("scheduled"); // Não existe no Healz
```

### 2. Estado Calculado

O estado atual é sempre **derivado do histórico de eventos**.

```typescript
// Estado atual = último evento de mudança de estágio
const currentStage = events
  .filter((e) => e.event_type === "JourneyStageChanged")
  .sort((a, b) => b.created_at - a.created_at)[0].event_data.new_stage;
```

### 3. Transições Unidirecionais (com exceções)

Estados geralmente progridem para frente, com algumas exceções permitidas:

```typescript
// ✅ Progressão normal
initiated → first_contact → scheduled → attended

// ✅ Exceção: Risco detectado
scheduled → at_risk

// ✅ Exceção: Recuperação
at_risk → recovered → scheduled
```

---

## Estados da PatientJourney

### Estados Primários (Progressão Normal)

| Estado          | Descrição          | Quando Entra                 | Próximos Estados               |
| --------------- | ------------------ | ---------------------------- | ------------------------------ |
| `initiated`     | Jornada criada     | PatientRegistered            | first_contact                  |
| `first_contact` | Primeira interação | ConversationStarted          | scheduled, at_risk             |
| `scheduled`     | Consulta agendada  | AppointmentScheduled         | confirmed, cancelled, at_risk  |
| `confirmed`     | Paciente confirmou | AppointmentConfirmed         | attended, no_show, at_risk     |
| `attended`      | Consulta realizada | AppointmentCompleted         | follow_up, returned, completed |
| `follow_up`     | Aguardando retorno | Sistema detecta necessidade  | returned, at_risk, abandoned   |
| `returned`      | Paciente voltou    | Nova consulta após follow-up | completed, follow_up           |

### Estados de Exceção (Riscos e Problemas)

| Estado      | Descrição                   | Quando Entra                     | Próximos Estados     |
| ----------- | --------------------------- | -------------------------------- | -------------------- |
| `at_risk`   | Risco de abandono detectado | RiskDetected (score > threshold) | recovered, abandoned |
| `no_show`   | Faltou à consulta           | AppointmentMarkedAsNoShow        | at_risk, rescheduled |
| `recovered` | Retomou após risco          | Interação positiva pós-risco     | scheduled, attended  |
| `abandoned` | Abandonou tratamento        | 30+ dias sem resposta            | completed (manual)   |

### Estados Finais

| Estado      | Descrição             | Quando Entra        | Próximos Estados |
| ----------- | --------------------- | ------------------- | ---------------- |
| `completed` | Jornada concluída     | JourneyCompleted    | Nenhum (final)   |
| `cancelled` | Cancelada manualmente | Ação administrativa | Nenhum (final)   |

---

## Diagrama de Estados

```
                    ┌──────────────┐
                    │  INITIATED   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
              ┌────►│ FIRST_CONTACT│────┐
              │     └──────┬───────┘    │
              │            │            │
              │            ▼            │
              │     ┌──────────────┐   │
              │     │  SCHEDULED   │◄──┤
              │     └──────┬───────┘   │
              │            │            │
              │            ▼            │
              │     ┌──────────────┐   │
              │     │  CONFIRMED   │   │
              │     └──────┬───────┘   │
              │            │            │
              │            ▼            │
      ┌───────┴─────┐ ┌────────┐      │
      │  RECOVERED  │ │NO_SHOW │      │
      └───────┬─────┘ └───┬────┘      │
              │           │            │
              │           ▼            │
              │     ┌──────────┐      │
              └────►│ AT_RISK  │◄─────┘
                    └────┬─────┘
                         │
                    ┌────┴─────┐
                    ▼          ▼
              ┌──────────┐ ┌───────────┐
              │ ATTENDED │ │ ABANDONED │
              └────┬─────┘ └─────┬─────┘
                   │             │
                   ▼             │
            ┌────────────┐       │
            │ FOLLOW_UP  │       │
            └─────┬──────┘       │
                  │              │
                  ▼              │
            ┌──────────┐         │
            │ RETURNED │         │
            └─────┬────┘         │
                  │              │
                  ▼              ▼
            ┌────────────────────┐
            │    COMPLETED       │
            └────────────────────┘
```

---

## Transições Detalhadas

### 1. initiated → first_contact

**Trigger:** `ConversationStarted`

**Condição:** Primeira mensagem do paciente

**Ação:** Nenhuma (apenas transição)

```typescript
{
  from: 'initiated',
  to: 'first_contact',
  event: 'ConversationStarted',
  guard: (journey) => journey.interactionCount === 0,
  action: null
}
```

---

### 2. first_contact → scheduled

**Trigger:** `AppointmentScheduled`

**Condição:** Consulta criada com sucesso

**Ação:**

- Agendar lembretes automáticos
- Atualizar retention_score (+0.2)

```typescript
{
  from: 'first_contact',
  to: 'scheduled',
  event: 'AppointmentScheduled',
  action: async (journey, event) => {
    await scheduleReminders(event.data.appointment_id);
    await journey.updateRetentionScore(+0.2);
  }
}
```

---

### 3. scheduled → confirmed

**Trigger:** `AppointmentConfirmed`

**Condição:** Paciente confirmou presença

**Ação:**

- Atualizar retention_score (+0.15)
- Cancelar lembretes adicionais

```typescript
{
  from: 'scheduled',
  to: 'confirmed',
  event: 'AppointmentConfirmed',
  action: async (journey, event) => {
    await journey.updateRetentionScore(+0.15);
    await cancelAdditionalReminders(event.data.appointment_id);
  }
}
```

---

### 4. confirmed → attended

**Trigger:** `AppointmentCompleted`

**Condição:** Consulta realizada

**Ação:**

- Atualizar retention_score (+0.3)
- Detectar necessidade de follow-up
- Enviar mensagem de pós-consulta

```typescript
{
  from: 'confirmed',
  to: 'attended',
  event: 'AppointmentCompleted',
  action: async (journey, event) => {
    await journey.updateRetentionScore(+0.3);

    if (requiresFollowUp(event.data.notes)) {
      await journey.advanceStage('follow_up');
      await scheduleFollowUpReminder(journey.id, 30); // 30 dias
    }

    await sendPostConsultationMessage(journey.patient_id);
  }
}
```

---

### 5. confirmed → no_show

**Trigger:** `AppointmentMarkedAsNoShow`

**Condição:** Paciente não compareceu

**Ação:**

- Atualizar retention_score (-0.4)
- Detectar risco automático
- Escalar se recorrente

```typescript
{
  from: 'confirmed',
  to: 'no_show',
  event: 'AppointmentMarkedAsNoShow',
  action: async (journey, event) => {
    await journey.updateRetentionScore(-0.4);

    const noShowCount = await countNoShows(journey.patient_id);

    if (noShowCount >= 2) {
      await journey.detectRisk({
        type: 'no_show',
        severity: 'high',
        value: 0.9
      });
      await journey.advanceStage('at_risk');
    }
  }
}
```

---

### 6. ANY → at_risk

**Trigger:** `RiskDetected` + `RiskScoreRecalculated` (score > 0.7)

**Condição:** Score de risco ultrapassa threshold

**Ação:**

- Criar alerta para gestor
- Disparar ação proativa (outreach humano ou bot)

```typescript
{
  from: ['first_contact', 'scheduled', 'confirmed', 'follow_up'],
  to: 'at_risk',
  event: 'RiskScoreRecalculated',
  guard: (journey) => journey.riskScore >= 0.7,
  action: async (journey, event) => {
    await createAlert({
      type: 'high_risk',
      patient_id: journey.patient_id,
      journey_id: journey.id,
      message: `Patient at high risk (score: ${journey.riskScore})`
    });

    if (journey.riskScore >= 0.85) {
      await escalateToHuman(journey.id);
    } else {
      await sendProactiveMessage(journey.patient_id);
    }
  }
}
```

---

### 7. at_risk → recovered

**Trigger:** `MessageReceived` após período de risco

**Condição:** Paciente retoma contato positivamente

**Ação:**

- Atualizar retention_score (+0.25)
- Limpar alertas de risco
- Retornar ao fluxo normal

```typescript
{
  from: 'at_risk',
  to: 'recovered',
  event: 'MessageReceived',
  guard: async (journey, event) => {
    const intent = await detectIntent(event.data.content);
    return intent.isPositive && intent.confidence > 0.7;
  },
  action: async (journey) => {
    await journey.updateRetentionScore(+0.25);
    await clearRiskAlerts(journey.id);
    await journey.recalculateRiskScore(); // Deve cair abaixo do threshold
  }
}
```

---

### 8. at_risk → abandoned

**Trigger:** Sistema (cron job diário) detecta 30+ dias sem resposta

**Condição:** Sem interação por 30 dias após estado at_risk

**Ação:**

- Gerar evento `JourneyAbandoned`
- Criar relatório de abandono
- Notificar gestor

```typescript
{
  from: 'at_risk',
  to: 'abandoned',
  trigger: 'SYSTEM_CHECK',
  guard: (journey) => {
    const daysSinceLastInteraction = differenceInDays(
      new Date(),
      journey.last_interaction_at
    );
    return daysSinceLastInteraction >= 30;
  },
  action: async (journey) => {
    await journey.markAsAbandoned({
      reason: `No interaction for ${daysSinceLastInteraction} days`
    });

    await notifyManager({
      type: 'abandonment',
      patient_id: journey.patient_id,
      journey_id: journey.id
    });
  }
}
```

---

### 9. attended → follow_up

**Trigger:** Sistema detecta necessidade de acompanhamento

**Condição:** Notas da consulta indicam retorno necessário

**Ação:**

- Agendar lembrete de follow-up
- Criar tarefa para agendamento futuro

```typescript
{
  from: 'attended',
  to: 'follow_up',
  trigger: 'SYSTEM_ANALYSIS',
  guard: (journey, lastAppointment) => {
    return requiresFollowUp(lastAppointment.notes);
  },
  action: async (journey) => {
    const followUpDate = addDays(new Date(), 30);

    await scheduleFollowUpReminder({
      journey_id: journey.id,
      scheduled_for: followUpDate,
      channel: 'whatsapp'
    });
  }
}
```

---

### 10. follow_up → returned

**Trigger:** `AppointmentScheduled` após período de follow-up

**Condição:** Nova consulta agendada após follow_up

**Ação:**

- Atualizar retention_score (+0.2)
- Marcar follow-up como bem-sucedido

```typescript
{
  from: 'follow_up',
  to: 'returned',
  event: 'AppointmentScheduled',
  guard: (journey) => {
    const daysSinceLastAppointment = differenceInDays(
      new Date(),
      journey.last_appointment_at
    );
    return daysSinceLastAppointment >= 7; // Não é reagendamento imediato
  },
  action: async (journey) => {
    await journey.updateRetentionScore(+0.2);
  }
}
```

---

### 11. returned/attended → completed

**Trigger:** Manual ou automático após tratamento concluído

**Condição:**

- Manual: Médico marca como concluído
- Automático: 6+ meses sem interação após última consulta bem-sucedida

**Ação:**

- Gerar relatório de jornada
- Arquivar dados (manter no Event Store)

```typescript
{
  from: ['returned', 'attended'],
  to: 'completed',
  event: 'JourneyCompleted',
  action: async (journey) => {
    await generateJourneyReport(journey.id);
    await archiveJourney(journey.id);
  }
}
```

---

## Sistema de Detecção de Risco

### Indicadores de Risco

| Tipo           | Peso | Threshold             | Ação           |
| -------------- | ---- | --------------------- | -------------- |
| `silence`      | 0.4  | 14+ dias sem resposta | Detectar risco |
| `no_show`      | 0.3  | 1 falta               | Score +0.3     |
| `no_show`      | 0.3  | 2+ faltas             | Escalar        |
| `cancellation` | 0.2  | 2+ cancelamentos      | Detectar risco |
| `tone_change`  | 0.1  | Sentiment negativo    | Score +0.1     |

### Cálculo do Risk Score

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
```

### Exemplo de Detecção

```typescript
// Paciente não responde há 14 dias
const silenceIndicator = {
  type: "silence",
  severity: "high",
  value: 0.8,
  metadata: {
    days_since_last_interaction: 14,
  },
};

journey.detectRisk(silenceIndicator);
journey.recalculateRiskScore();

// Score = (0.8 * 0.4) / 0.4 = 0.8
// Threshold = 0.7
// → Transição para 'at_risk'
```

---

## Jobs do Sistema

### 1. Risk Detection Job

**Frequência:** A cada 1 hora

**Propósito:** Detectar pacientes em silêncio prolongado

```typescript
async function detectSilenceRisk() {
  const activeJourneys = await journeyRepo.findByStatuses([
    "first_contact",
    "scheduled",
    "confirmed",
    "follow_up",
  ]);

  for (const journey of activeJourneys) {
    const daysSinceLastInteraction = differenceInDays(
      new Date(),
      journey.last_interaction_at,
    );

    if (daysSinceLastInteraction >= 14) {
      await journey.detectRisk({
        type: "silence",
        severity: daysSinceLastInteraction >= 21 ? "high" : "medium",
        value: Math.min(daysSinceLastInteraction / 30, 1.0),
      });

      await journey.recalculateRiskScore();
    }
  }
}
```

---

### 2. Abandonment Detection Job

**Frequência:** Diariamente às 8h

**Propósito:** Marcar jornadas como abandonadas

```typescript
async function detectAbandonment() {
  const atRiskJourneys = await journeyRepo.findByStatus("at_risk");

  for (const journey of atRiskJourneys) {
    const daysSinceLastInteraction = differenceInDays(
      new Date(),
      journey.last_interaction_at,
    );

    if (daysSinceLastInteraction >= 30) {
      await journey.markAsAbandoned({
        reason: `No interaction for ${daysSinceLastInteraction} days`,
      });
    }
  }
}
```

---

### 3. Follow-up Reminder Job

**Frequência:** Diariamente às 9h

**Propósito:** Enviar lembretes de follow-up

```typescript
async function sendFollowUpReminders() {
  const followUpJourneys = await journeyRepo.findByStatus("follow_up");

  for (const journey of followUpJourneys) {
    const daysSinceLastAppointment = differenceInDays(
      new Date(),
      journey.last_appointment_at,
    );

    if (daysSinceLastAppointment === 30) {
      await sendWhatsAppMessage({
        patient_id: journey.patient_id,
        template: "follow_up_reminder",
        data: {
          patient_name: journey.patient_name,
          clinic_name: journey.clinic_name,
        },
      });
    }
  }
}
```

---

## Implementação Técnica

### State Machine Engine

```typescript
class StateMachine {
  private transitions: Transition[];

  constructor(transitions: Transition[]) {
    this.transitions = transitions;
  }

  async process(journey: PatientJourney, event: DomainEvent) {
    const applicableTransitions = this.transitions.filter((t) =>
      t.canApply(journey.currentStage, event),
    );

    for (const transition of applicableTransitions) {
      if (await transition.guard(journey, event)) {
        await this.executeTransition(journey, transition, event);
      }
    }
  }

  private async executeTransition(
    journey: PatientJourney,
    transition: Transition,
    event: DomainEvent,
  ) {
    // Executar ação
    if (transition.action) {
      await transition.action(journey, event);
    }

    // Mudar estágio
    await journey.advanceStage(transition.to, {
      reason: `Triggered by ${event.event_type}`,
      previous_event_id: event.event_id,
    });
  }
}
```

### Transition Definition

```typescript
interface Transition {
  from: JourneyStage | JourneyStage[];
  to: JourneyStage;
  event?: string;
  trigger?: "SYSTEM_CHECK" | "SYSTEM_ANALYSIS";
  guard?: (
    journey: PatientJourney,
    event?: DomainEvent,
  ) => boolean | Promise<boolean>;
  action?: (journey: PatientJourney, event?: DomainEvent) => Promise<void>;

  canApply(currentStage: JourneyStage, event: DomainEvent): boolean;
}
```

---

## Métricas e Observabilidade

### Métricas por Estado

```typescript
// Distribuição de pacientes por estágio
{
  "first_contact": 45,
  "scheduled": 120,
  "confirmed": 85,
  "attended": 200,
  "follow_up": 30,
  "at_risk": 15,
  "abandoned": 8
}
```

### Tempo Médio por Estado

```typescript
// Duração média em cada estágio (dias)
{
  "first_contact": 2.3,
  "scheduled": 7.5,
  "confirmed": 1.2,
  "follow_up": 28.4,
  "at_risk": 12.1
}
```

### Taxa de Conversão entre Estados

```typescript
// % que progridem para próximo estágio
{
  "first_contact → scheduled": 75%,
  "scheduled → confirmed": 85%,
  "confirmed → attended": 92%,
  "at_risk → recovered": 45%,
  "at_risk → abandoned": 35%
}
```

---

## Decisões Arquiteturais

### 1. Estado Derivado vs. Armazenado

**Decisão:** Estado atual é **materializado** em read model, mas **derivável** do Event Store

**Razão:**

- Performance em queries
- Consistência eventual aceitável
- Event Store sempre é fonte da verdade

---

### 2. Transições Síncronas vs. Assíncronas

**Decisão:** Transições críticas são **síncronas**, secundárias são **assíncronas**

**Críticas (síncronas):**

- first_contact → scheduled
- scheduled → confirmed
- confirmed → attended

**Secundárias (assíncronas via jobs):**

- ANY → at_risk (detecção de risco)
- at_risk → abandoned (abandonment check)

---

### 3. Guard Conditions Complexas

**Decisão:** Guards podem fazer queries adicionais, mas devem ser **rápidas**

**Exemplo:**

```typescript
guard: async (journey) => {
  // ✅ CERTO - Query simples e indexada
  const noShowCount = await db
    .select({ count: sql`count(*)` })
    .from(appointments)
    .where(
      and(
        eq(appointments.patient_id, journey.patient_id),
        eq(appointments.status, "no_show"),
      ),
    );

  return noShowCount > 1;
};
```

---

## Questões em Aberto

### 1. Threshold de Risco

- **Questão:** Qual o threshold ideal para `at_risk`?
- **Atual:** 0.7
- **Considerar:** Ajustar por especialidade ou histórico da clínica

### 2. Tempo de Abandonment

- **Questão:** 30 dias é ideal para todas as especialidades?
- **Atual:** 30 dias fixo
- **Considerar:** Configurável por clínica/especialidade

### 3. Follow-up Automático

- **Questão:** Como detectar automaticamente necessidade de follow-up?
- **Atual:** Parsing de notas do médico
- **Considerar:** LLM para análise mais sofisticada

---

## Próximos Passos

1. ✅ Estados e transições definidos
2. ✅ Jobs do sistema especificados
3. ✅ Sistema de detecção de risco detalhado
4. ⏳ **Próximo:** PROJECTIONS.md - Read Models para dashboards
5. ⏳ Implementação do State Machine Engine
6. ⏳ Testes de transições complexas
7. ⏳ Tuning de thresholds com dados reais

---

## Documentação Relacionada

- [AGGREGATES.md](./AGGREGATES.md) - Agregado PatientJourney
- [EVENTS.md](./EVENTS.md) - Eventos que disparam transições
- [DATABASE.md](./DATABASE.md) - Event Store
- [PROJECTIONS.md](./PROJECTIONS.md) - Read Models (próximo)

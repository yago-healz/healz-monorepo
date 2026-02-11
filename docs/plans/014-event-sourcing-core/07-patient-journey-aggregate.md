# Fase 7: PatientJourney Aggregate

## Objetivo

Implementar o agregado PatientJourney que rastreia toda a jornada do paciente atraves de estagios (stages) e calcula o risco (risk score) baseado em comportamentos e eventos.

## Pre-requisitos

- Fase 1 concluida (Event Store Foundation)
- Fase 2 concluida (Patient Aggregate)
- Fase 4 concluida (Conversation Aggregate)
- Fase 6 concluida (Appointment Aggregate)

## Escopo

### O que sera implementado

1. **Agregado PatientJourney** - State machine de jornada
2. **Journey Stages** - Estagios da jornada (lead, engaged, scheduled, etc.)
3. **Risk Score** - Calculo dinamico de risco
4. **Domain Events** - JourneyStarted, JourneyStageChanged, RiskDetected, RiskScoreRecalculated, JourneyMilestoneReached
5. **Projection patient_journey_view** - Read model via Drizzle
6. **Process Manager** - Orquestracao de eventos entre agregados

### O que NAO sera implementado

- Machine Learning para predicao de risco
- Analise de sentimento avancada
- Dashboard de analytics (frontend)
- Alertas automaticos (notificacoes)

## Estrutura de Arquivos

```
apps/api/src/
+-- db/schema/
|   +-- patient-journey-view.schema.ts   # NOVO - Projection table
|   +-- index.ts                         # Atualizar com export
+-- patient-journey/
|   +-- patient-journey.module.ts
|   +-- domain/
|   |   +-- patient-journey.aggregate.ts
|   |   +-- journey-stage.ts
|   |   +-- risk-score.ts
|   |   +-- events/
|   |       +-- journey-started.event.ts
|   |       +-- journey-stage-changed.event.ts
|   |       +-- risk-detected.event.ts
|   |       +-- risk-score-recalculated.event.ts
|   |       +-- journey-milestone-reached.event.ts
|   +-- application/
|   |   +-- patient-journey.service.ts
|   |   +-- event-handlers/
|   |   |   +-- journey-projection.handler.ts
|   |   +-- process-managers/
|   |       +-- patient-journey.process-manager.ts
|   +-- api/
|       +-- patient-journey.controller.ts
```

## Journey Stages

```typescript
// domain/journey-stage.ts

export enum JourneyStage {
  LEAD = "lead",
  ENGAGED = "engaged",
  SCHEDULED = "scheduled",
  CONFIRMED = "confirmed",
  IN_TREATMENT = "in_treatment",
  COMPLETED = "completed",
  DROPPED = "dropped",
  AT_RISK = "at_risk",
}

export const STAGE_TRANSITIONS: Record<JourneyStage, JourneyStage[]> = {
  [JourneyStage.LEAD]: [JourneyStage.ENGAGED, JourneyStage.DROPPED],
  [JourneyStage.ENGAGED]: [JourneyStage.SCHEDULED, JourneyStage.AT_RISK, JourneyStage.DROPPED],
  [JourneyStage.SCHEDULED]: [
    JourneyStage.CONFIRMED,
    JourneyStage.AT_RISK,
    JourneyStage.ENGAGED,
    JourneyStage.DROPPED,
  ],
  [JourneyStage.CONFIRMED]: [
    JourneyStage.IN_TREATMENT,
    JourneyStage.AT_RISK,
    JourneyStage.SCHEDULED,
  ],
  [JourneyStage.IN_TREATMENT]: [JourneyStage.COMPLETED, JourneyStage.SCHEDULED],
  [JourneyStage.COMPLETED]: [],
  [JourneyStage.DROPPED]: [JourneyStage.ENGAGED],
  [JourneyStage.AT_RISK]: [
    JourneyStage.ENGAGED,
    JourneyStage.SCHEDULED,
    JourneyStage.CONFIRMED,
    JourneyStage.DROPPED,
  ],
};
```

## Risk Score

```typescript
// domain/risk-score.ts

export interface RiskFactor {
  name: string;
  weight: number; // 0-1
  score: number;  // 0-100
}

export function calculateRiskScore(factors: RiskFactor[]): number {
  if (factors.length === 0) return 0;

  const weightedSum = factors.reduce(
    (sum, factor) => sum + factor.score * factor.weight,
    0,
  );
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);

  return Math.round(weightedSum / totalWeight);
}

export function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score < 25) return "low";
  if (score < 50) return "medium";
  if (score < 75) return "high";
  return "critical";
}

export const RISK_FACTORS = {
  NO_SHOW: { name: "no_show", weight: 1.0, score: 100 },
  FREQUENT_CANCELLATIONS: { name: "frequent_cancellations", weight: 0.8, score: 75 },
  UNRESPONSIVE: { name: "unresponsive", weight: 0.6, score: 60 },
  NOT_CONFIRMED: { name: "not_confirmed", weight: 0.5, score: 50 },
  MULTIPLE_RESCHEDULES: { name: "multiple_reschedules", weight: 0.4, score: 40 },
  INACTIVE: { name: "inactive", weight: 0.3, score: 30 },
};
```

**Nota:** Usamos funcoes puras ao inves de uma classe `RiskScore`. Mais simples e facil de testar.

## Projection Schema (Drizzle)

```typescript
// src/db/schema/patient-journey-view.schema.ts

import {
  pgTable, uuid, varchar, integer, jsonb,
  timestamp, index,
} from "drizzle-orm/pg-core";

export const patientJourneyView = pgTable("patient_journey_view", {
  id: uuid("id").primaryKey(),
  patientId: uuid("patient_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  clinicId: uuid("clinic_id").notNull(),

  currentStage: varchar("current_stage", { length: 50 }).notNull().default("lead"),
  riskScore: integer("risk_score").notNull().default(0),
  riskLevel: varchar("risk_level", { length: 20 }).notNull().default("low"),

  milestones: jsonb("milestones").notNull().default([]),
  stageHistory: jsonb("stage_history").notNull().default([]),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("idx_journey_patient").on(table.patientId),
  index("idx_journey_clinic").on(table.clinicId),
  index("idx_journey_stage").on(table.currentStage),
  index("idx_journey_risk_level").on(table.riskLevel),
  index("idx_journey_risk_score").on(table.riskScore),
]);
```

**Nota:** Adicionar `export * from "./patient-journey-view.schema"` no `src/db/schema/index.ts` e rodar migration.

## Eventos

Todos seguem o padrao factory function retornando `DomainEvent<T>`.

```typescript
// domain/events/journey-started.event.ts

import { randomUUID } from "crypto";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";

export interface JourneyStartedData {
  journey_id: string;
  patient_id: string;
  tenant_id: string;
  clinic_id: string;
  initial_stage: string;
}

export function createJourneyStartedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  data: JourneyStartedData;
}): DomainEvent<JourneyStartedData> {
  return {
    event_id: randomUUID(),
    event_type: "JourneyStarted",
    aggregate_type: "PatientJourney",
    aggregate_id: params.aggregateId,
    aggregate_version: params.aggregateVersion,
    tenant_id: params.tenantId,
    clinic_id: params.clinicId,
    correlation_id: params.correlationId,
    causation_id: params.causationId,
    created_at: new Date(),
    event_data: params.data,
  };
}
```

```typescript
// domain/events/journey-stage-changed.event.ts

export interface JourneyStageChangedData {
  journey_id: string;
  previous_stage: string;
  new_stage: string;
  reason: string;
  triggered_by: string; // eventId or userId
}

// Mesmo padrao factory function - createJourneyStageChangedEvent(...)
```

```typescript
// domain/events/risk-detected.event.ts

export interface RiskDetectedData {
  journey_id: string;
  risk_factors: RiskFactor[];
  risk_score: number;
  risk_level: string;
}

// Mesmo padrao factory function - createRiskDetectedEvent(...)
```

```typescript
// domain/events/risk-score-recalculated.event.ts

export interface RiskScoreRecalculatedData {
  journey_id: string;
  previous_score: number;
  new_score: number;
  factors: RiskFactor[];
}

// Mesmo padrao factory function - createRiskScoreRecalculatedEvent(...)
```

```typescript
// domain/events/journey-milestone-reached.event.ts

export interface JourneyMilestoneReachedData {
  journey_id: string;
  milestone: string; // "first_message", "first_appointment", "treatment_completed", etc.
  reached_at: string; // ISO 8601
}

// Mesmo padrao factory function - createJourneyMilestoneReachedEvent(...)
```

## Agregado PatientJourney

```typescript
// domain/patient-journey.aggregate.ts

import { AggregateRoot } from "../../event-sourcing/domain/aggregate-root";
import { DomainEvent } from "../../event-sourcing/domain/domain-event.interface";
import { JourneyStage, STAGE_TRANSITIONS } from "./journey-stage";
import { RiskFactor, calculateRiskScore, getRiskLevel } from "./risk-score";
import { createJourneyStartedEvent, JourneyStartedData } from "./events/journey-started.event";
import { createJourneyStageChangedEvent, JourneyStageChangedData } from "./events/journey-stage-changed.event";
import { createRiskDetectedEvent, RiskDetectedData } from "./events/risk-detected.event";
import { createRiskScoreRecalculatedEvent, RiskScoreRecalculatedData } from "./events/risk-score-recalculated.event";
import { createJourneyMilestoneReachedEvent, JourneyMilestoneReachedData } from "./events/journey-milestone-reached.event";

export class PatientJourney extends AggregateRoot {
  private patientId: string;
  private tenantId: string;
  private clinicId: string;
  private currentStage: JourneyStage;
  private riskScore: number = 0;
  private milestones: Set<string> = new Set();
  private stageHistory: Array<{ stage: string; timestamp: string }> = [];

  private constructor() {
    super();
  }

  static start(params: {
    journeyId: string;
    patientId: string;
    tenantId: string;
    clinicId: string;
    correlationId: string;
    causationId?: string;
  }): PatientJourney {
    const journey = new PatientJourney();

    const event = createJourneyStartedEvent({
      aggregateId: params.journeyId,
      aggregateVersion: 1,
      tenantId: params.tenantId,
      clinicId: params.clinicId,
      correlationId: params.correlationId,
      causationId: params.causationId,
      data: {
        journey_id: params.journeyId,
        patient_id: params.patientId,
        tenant_id: params.tenantId,
        clinic_id: params.clinicId,
        initial_stage: JourneyStage.LEAD,
      },
    });

    journey.addEvent(event);
    return journey;
  }

  // Commands

  transitionTo(params: {
    newStage: JourneyStage;
    reason: string;
    triggeredBy: string;
    correlationId: string;
    causationId?: string;
  }): void {
    const allowedTransitions = STAGE_TRANSITIONS[this.currentStage];

    if (!allowedTransitions.includes(params.newStage)) {
      throw new Error(
        `Invalid transition from ${this.currentStage} to ${params.newStage}`,
      );
    }

    const event = createJourneyStageChangedEvent({
      aggregateId: this.id,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      causationId: params.causationId,
      data: {
        journey_id: this.id,
        previous_stage: this.currentStage,
        new_stage: params.newStage,
        reason: params.reason,
        triggered_by: params.triggeredBy,
      },
    });

    this.addEvent(event);
  }

  detectRisk(params: {
    factors: RiskFactor[];
    correlationId: string;
    causationId?: string;
  }): void {
    const score = calculateRiskScore(params.factors);
    const level = getRiskLevel(score);

    const event = createRiskDetectedEvent({
      aggregateId: this.id,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      causationId: params.causationId,
      data: {
        journey_id: this.id,
        risk_factors: params.factors,
        risk_score: score,
        risk_level: level,
      },
    });

    this.addEvent(event);

    // Se risco alto e nao esta em AT_RISK, transicionar
    if (
      (level === "high" || level === "critical") &&
      this.currentStage !== JourneyStage.AT_RISK &&
      this.currentStage !== JourneyStage.COMPLETED
    ) {
      this.transitionTo({
        newStage: JourneyStage.AT_RISK,
        reason: `High risk detected: ${score}`,
        triggeredBy: "system",
        correlationId: params.correlationId,
        causationId: params.causationId,
      });
    }
  }

  recalculateRiskScore(params: {
    factors: RiskFactor[];
    correlationId: string;
    causationId?: string;
  }): void {
    const newScore = calculateRiskScore(params.factors);
    const previousScore = this.riskScore;

    const event = createRiskScoreRecalculatedEvent({
      aggregateId: this.id,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      causationId: params.causationId,
      data: {
        journey_id: this.id,
        previous_score: previousScore,
        new_score: newScore,
        factors: params.factors,
      },
    });

    this.addEvent(event);
  }

  reachMilestone(params: {
    milestone: string;
    correlationId: string;
    causationId?: string;
  }): void {
    if (this.milestones.has(params.milestone)) {
      return; // Ja alcancado
    }

    const event = createJourneyMilestoneReachedEvent({
      aggregateId: this.id,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      causationId: params.causationId,
      data: {
        journey_id: this.id,
        milestone: params.milestone,
        reached_at: new Date().toISOString(),
      },
    });

    this.addEvent(event);
  }

  // Event handlers

  protected applyEvent(event: DomainEvent): void {
    switch (event.event_type) {
      case "JourneyStarted":
        this.applyJourneyStarted(event.event_data as JourneyStartedData);
        break;
      case "JourneyStageChanged":
        this.applyStageChanged(event.event_data as JourneyStageChangedData);
        break;
      case "RiskDetected":
        this.applyRiskDetected(event.event_data as RiskDetectedData);
        break;
      case "RiskScoreRecalculated":
        this.applyRiskRecalculated(event.event_data as RiskScoreRecalculatedData);
        break;
      case "JourneyMilestoneReached":
        this.applyMilestoneReached(event.event_data as JourneyMilestoneReachedData);
        break;
    }
  }

  private applyJourneyStarted(data: JourneyStartedData): void {
    this.id = data.journey_id;
    this.patientId = data.patient_id;
    this.tenantId = data.tenant_id;
    this.clinicId = data.clinic_id;
    this.currentStage = data.initial_stage as JourneyStage;
    this.riskScore = 0;
    this.stageHistory.push({ stage: data.initial_stage, timestamp: new Date().toISOString() });
  }

  private applyStageChanged(data: JourneyStageChangedData): void {
    this.currentStage = data.new_stage as JourneyStage;
    this.stageHistory.push({ stage: data.new_stage, timestamp: new Date().toISOString() });
  }

  private applyRiskDetected(data: RiskDetectedData): void {
    this.riskScore = data.risk_score;
  }

  private applyRiskRecalculated(data: RiskScoreRecalculatedData): void {
    this.riskScore = data.new_score;
  }

  private applyMilestoneReached(data: JourneyMilestoneReachedData): void {
    this.milestones.add(data.milestone);
  }

  // Getters
  getPatientId(): string { return this.patientId; }
  getTenantId(): string { return this.tenantId; }
  getClinicId(): string { return this.clinicId; }
  getCurrentStage(): JourneyStage { return this.currentStage; }
  getRiskScore(): number { return this.riskScore; }
  getRiskLevel(): string { return getRiskLevel(this.riskScore); }
  getMilestones(): string[] { return Array.from(this.milestones); }
  getStageHistory(): Array<{ stage: string; timestamp: string }> { return [...this.stageHistory]; }
}
```

## Projection Handler

```typescript
// application/event-handlers/journey-projection.handler.ts

import { Injectable, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { patientJourneyView } from "../../../db/schema/patient-journey-view.schema";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";
import { getRiskLevel } from "../../domain/risk-score";

@Injectable()
export class JourneyProjectionHandler implements OnModuleInit {
  private readonly logger = new Logger(JourneyProjectionHandler.name);

  constructor(@Inject("IEventBus") private readonly eventBus: IEventBus) {}

  onModuleInit() {
    this.eventBus.subscribe("JourneyStarted", (e) => this.onJourneyStarted(e));
    this.eventBus.subscribe("JourneyStageChanged", (e) => this.onStageChanged(e));
    this.eventBus.subscribe("RiskDetected", (e) => this.onRiskDetected(e));
    this.eventBus.subscribe("RiskScoreRecalculated", (e) => this.onRiskRecalculated(e));
    this.eventBus.subscribe("JourneyMilestoneReached", (e) => this.onMilestoneReached(e));
  }

  private async onJourneyStarted(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db.insert(patientJourneyView).values({
      id: data.journey_id,
      patientId: data.patient_id,
      tenantId: data.tenant_id,
      clinicId: data.clinic_id,
      currentStage: data.initial_stage,
      riskScore: 0,
      riskLevel: "low",
      milestones: [],
      stageHistory: [{ stage: data.initial_stage, timestamp: event.created_at }],
      createdAt: event.created_at,
      updatedAt: event.created_at,
    });
  }

  private async onStageChanged(event: DomainEvent): Promise<void> {
    const data = event.event_data;

    // Buscar stageHistory atual para fazer append
    const [current] = await db.select({ stageHistory: patientJourneyView.stageHistory })
      .from(patientJourneyView)
      .where(eq(patientJourneyView.id, event.aggregate_id));

    const history = (current?.stageHistory as any[]) || [];
    history.push({ stage: data.new_stage, timestamp: event.created_at, reason: data.reason });

    await db.update(patientJourneyView)
      .set({
        currentStage: data.new_stage,
        stageHistory: history,
        updatedAt: new Date(),
      })
      .where(eq(patientJourneyView.id, event.aggregate_id));
  }

  private async onRiskDetected(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db.update(patientJourneyView)
      .set({
        riskScore: data.risk_score,
        riskLevel: data.risk_level,
        updatedAt: new Date(),
      })
      .where(eq(patientJourneyView.id, event.aggregate_id));
  }

  private async onRiskRecalculated(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db.update(patientJourneyView)
      .set({
        riskScore: data.new_score,
        riskLevel: getRiskLevel(data.new_score),
        updatedAt: new Date(),
      })
      .where(eq(patientJourneyView.id, event.aggregate_id));
  }

  private async onMilestoneReached(event: DomainEvent): Promise<void> {
    const data = event.event_data;

    // Buscar milestones atuais para fazer append
    const [current] = await db.select({ milestones: patientJourneyView.milestones })
      .from(patientJourneyView)
      .where(eq(patientJourneyView.id, event.aggregate_id));

    const milestones = (current?.milestones as any[]) || [];
    milestones.push({ milestone: data.milestone, reached_at: data.reached_at });

    await db.update(patientJourneyView)
      .set({
        milestones,
        updatedAt: new Date(),
      })
      .where(eq(patientJourneyView.id, event.aggregate_id));
  }
}
```

## Process Manager

O Process Manager orquestra a jornada do paciente reagindo a eventos de outros agregados.

```typescript
// application/process-managers/patient-journey.process-manager.ts

import { Injectable, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "crypto";
import { eq, and, ne, sql } from "drizzle-orm";
import { db } from "../../../db";
import { patientJourneyView } from "../../../db/schema/patient-journey-view.schema";
import { appointmentView } from "../../../db/schema/appointment-view.schema";
import { IEventStore } from "../../../event-sourcing/event-store/event-store.interface";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";
import { PatientJourney } from "../../domain/patient-journey.aggregate";
import { JourneyStage } from "../../domain/journey-stage";
import { RISK_FACTORS } from "../../domain/risk-score";

@Injectable()
export class PatientJourneyProcessManager implements OnModuleInit {
  private readonly logger = new Logger(PatientJourneyProcessManager.name);

  constructor(
    @Inject("IEventStore") private readonly eventStore: IEventStore,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe("PatientRegistered", (e) => this.onPatientRegistered(e));
    this.eventBus.subscribe("MessageReceived", (e) => this.onMessageReceived(e));
    this.eventBus.subscribe("AppointmentScheduled", (e) => this.onAppointmentScheduled(e));
    this.eventBus.subscribe("AppointmentConfirmed", (e) => this.onAppointmentConfirmed(e));
    this.eventBus.subscribe("AppointmentCancelled", (e) => this.onAppointmentCancelled(e));
    this.eventBus.subscribe("AppointmentNoShow", (e) => this.onAppointmentNoShow(e));
    this.eventBus.subscribe("AppointmentCompleted", (e) => this.onAppointmentCompleted(e));
  }

  // Quando paciente e registrado, iniciar jornada
  private async onPatientRegistered(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journeyId = randomUUID();

    const journey = PatientJourney.start({
      journeyId,
      patientId: event.aggregate_id,
      tenantId: event.tenant_id,
      clinicId: event.clinic_id,
      correlationId: event.correlation_id,
      causationId: event.event_id,
    });

    await this.saveAndPublish(journey);
  }

  // Quando mensagem e recebida, atualizar engajamento
  private async onMessageReceived(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journey = await this.findJourneyByPatientId(data.patient_id);
    if (!journey) return;

    // Se estava em LEAD, mover para ENGAGED
    if (journey.getCurrentStage() === JourneyStage.LEAD) {
      journey.transitionTo({
        newStage: JourneyStage.ENGAGED,
        reason: "Patient sent first message",
        triggeredBy: event.event_id,
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    // Milestone: primeira mensagem
    if (journey.getMilestones().length === 0) {
      journey.reachMilestone({
        milestone: "first_message",
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    await this.saveAndPublish(journey);
  }

  // Quando appointment e agendado
  private async onAppointmentScheduled(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journey = await this.findJourneyByPatientId(data.patient_id);
    if (!journey) return;

    if (
      journey.getCurrentStage() === JourneyStage.ENGAGED ||
      journey.getCurrentStage() === JourneyStage.AT_RISK
    ) {
      journey.transitionTo({
        newStage: JourneyStage.SCHEDULED,
        reason: "Appointment scheduled",
        triggeredBy: event.event_id,
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    if (!journey.getMilestones().includes("first_appointment")) {
      journey.reachMilestone({
        milestone: "first_appointment",
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    await this.saveAndPublish(journey);
  }

  // Quando appointment e confirmado
  private async onAppointmentConfirmed(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journey = await this.findJourneyByAppointmentPatient(data.appointment_id);
    if (!journey) return;

    if (journey.getCurrentStage() === JourneyStage.SCHEDULED) {
      journey.transitionTo({
        newStage: JourneyStage.CONFIRMED,
        reason: "Appointment confirmed",
        triggeredBy: event.event_id,
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    await this.saveAndPublish(journey);
  }

  // Quando appointment e cancelado
  private async onAppointmentCancelled(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journey = await this.findJourneyByAppointmentPatient(data.appointment_id);
    if (!journey) return;

    // Verificar cancelamentos frequentes
    const cancellationCount = await this.getCancellationCount(journey.getPatientId());

    if (cancellationCount >= 2) {
      journey.detectRisk({
        factors: [RISK_FACTORS.FREQUENT_CANCELLATIONS],
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    } else {
      journey.transitionTo({
        newStage: JourneyStage.ENGAGED,
        reason: "Appointment cancelled",
        triggeredBy: event.event_id,
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    await this.saveAndPublish(journey);
  }

  // Quando ha no-show
  private async onAppointmentNoShow(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journey = await this.findJourneyByAppointmentPatient(data.appointment_id);
    if (!journey) return;

    journey.detectRisk({
      factors: [RISK_FACTORS.NO_SHOW],
      correlationId: event.correlation_id,
      causationId: event.event_id,
    });

    await this.saveAndPublish(journey);
  }

  // Quando appointment e completado
  private async onAppointmentCompleted(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journey = await this.findJourneyByAppointmentPatient(data.appointment_id);
    if (!journey) return;

    journey.transitionTo({
      newStage: JourneyStage.IN_TREATMENT,
      reason: "Appointment completed",
      triggeredBy: event.event_id,
      correlationId: event.correlation_id,
      causationId: event.event_id,
    });

    if (!journey.getMilestones().includes("first_consultation_completed")) {
      journey.reachMilestone({
        milestone: "first_consultation_completed",
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    await this.saveAndPublish(journey);
  }

  // Helpers

  private async loadAggregate(id: string): Promise<PatientJourney> {
    const events = await this.eventStore.getByAggregateId("PatientJourney", id);
    if (events.length === 0) {
      throw new Error("Journey not found");
    }
    const journey = new (PatientJourney as any)();
    journey.loadFromHistory(events);
    return journey;
  }

  private async saveAndPublish(journey: PatientJourney): Promise<void> {
    const events = journey.getUncommittedEvents();
    if (events.length === 0) return;
    await this.eventStore.appendMany(events);
    await this.eventBus.publishMany(events);
  }

  private async findJourneyByPatientId(patientId: string): Promise<PatientJourney | null> {
    const [result] = await db.select({ id: patientJourneyView.id })
      .from(patientJourneyView)
      .where(
        and(
          eq(patientJourneyView.patientId, patientId),
          ne(patientJourneyView.currentStage, JourneyStage.COMPLETED),
        ),
      );

    if (!result) return null;
    return this.loadAggregate(result.id);
  }

  private async findJourneyByAppointmentPatient(appointmentId: string): Promise<PatientJourney | null> {
    // Buscar o patientId do appointment e depois buscar a journey
    const [appt] = await db.select({ patientId: appointmentView.patientId })
      .from(appointmentView)
      .where(eq(appointmentView.id, appointmentId));

    if (!appt) return null;
    return this.findJourneyByPatientId(appt.patientId);
  }

  private async getCancellationCount(patientId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(appointmentView)
      .where(
        and(
          eq(appointmentView.patientId, patientId),
          eq(appointmentView.status, "cancelled"),
        ),
      );

    return result?.count || 0;
  }
}
```

## Application Service

```typescript
// application/patient-journey.service.ts

import { Injectable, Inject } from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../../db";
import { patientJourneyView } from "../../../db/schema/patient-journey-view.schema";
import { IEventStore } from "../../../event-sourcing/event-store/event-store.interface";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { PatientJourney } from "../../domain/patient-journey.aggregate";

@Injectable()
export class PatientJourneyService {
  constructor(
    @Inject("IEventStore") private readonly eventStore: IEventStore,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
  ) {}

  private async loadAggregate(id: string): Promise<PatientJourney> {
    const events = await this.eventStore.getByAggregateId("PatientJourney", id);
    if (events.length === 0) {
      throw new Error("Journey not found");
    }
    const journey = new (PatientJourney as any)();
    journey.loadFromHistory(events);
    return journey;
  }

  private async saveAndPublish(journey: PatientJourney): Promise<void> {
    const events = journey.getUncommittedEvents();
    await this.eventStore.appendMany(events);
    await this.eventBus.publishMany(events);
  }
}
```

## API REST (Temporaria)

```typescript
// api/patient-journey.controller.ts

import { Controller, Get, Param, Query, NotFoundException } from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../../db";
import { patientJourneyView } from "../../../db/schema/patient-journey-view.schema";

@Controller("journeys")
export class PatientJourneyController {
  @Get(":id")
  async findOne(@Param("id") id: string) {
    const [result] = await db.select()
      .from(patientJourneyView)
      .where(eq(patientJourneyView.id, id));

    if (!result) throw new NotFoundException("Journey not found");
    return result;
  }

  @Get()
  async findAll(
    @Query("patientId") patientId?: string,
    @Query("clinicId") clinicId?: string,
    @Query("stage") stage?: string,
    @Query("riskLevel") riskLevel?: string,
  ) {
    const conditions = [];
    if (patientId) conditions.push(eq(patientJourneyView.patientId, patientId));
    if (clinicId) conditions.push(eq(patientJourneyView.clinicId, clinicId));
    if (stage) conditions.push(eq(patientJourneyView.currentStage, stage));
    if (riskLevel) conditions.push(eq(patientJourneyView.riskLevel, riskLevel));

    return db.select()
      .from(patientJourneyView)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(patientJourneyView.updatedAt));
  }
}
```

## Module Configuration

```typescript
// patient-journey.module.ts

import { Module } from "@nestjs/common";
import { PatientJourneyController } from "./api/patient-journey.controller";
import { PatientJourneyService } from "./application/patient-journey.service";
import { JourneyProjectionHandler } from "./application/event-handlers/journey-projection.handler";
import { PatientJourneyProcessManager } from "./application/process-managers/patient-journey.process-manager";

@Module({
  controllers: [PatientJourneyController],
  providers: [
    PatientJourneyService,
    JourneyProjectionHandler,
    PatientJourneyProcessManager,
  ],
  exports: [PatientJourneyService],
})
export class PatientJourneyModule {}
```

**Nota:** Adicionar `PatientJourneyModule` nos imports do `AppModule`.

## Testes

### Testes do Agregado

```typescript
describe("PatientJourney Aggregate", () => {
  it("should start journey", () => {
    const journey = PatientJourney.start({
      journeyId: "j-1",
      patientId: "patient-1",
      tenantId: "tenant-1",
      clinicId: "clinic-1",
      correlationId: "corr-1",
    });

    expect(journey.getCurrentStage()).toBe(JourneyStage.LEAD);
    const events = journey.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("JourneyStarted");
  });

  it("should transition from LEAD to ENGAGED", () => {
    const journey = createTestJourney();
    journey.clearUncommittedEvents();

    journey.transitionTo({
      newStage: JourneyStage.ENGAGED,
      reason: "First message sent",
      triggeredBy: "system",
      correlationId: "corr-2",
    });

    expect(journey.getCurrentStage()).toBe(JourneyStage.ENGAGED);
    expect(journey.getUncommittedEvents()[0].event_type).toBe("JourneyStageChanged");
  });

  it("should not allow invalid transition", () => {
    const journey = createTestJourney();

    expect(() => {
      journey.transitionTo({
        newStage: JourneyStage.COMPLETED,
        reason: "Invalid",
        triggeredBy: "system",
        correlationId: "corr-2",
      });
    }).toThrow("Invalid transition");
  });

  it("should detect risk and transition to AT_RISK", () => {
    const journey = createTestJourney();
    // Transicionar para ENGAGED primeiro (LEAD -> ENGAGED)
    journey.transitionTo({
      newStage: JourneyStage.ENGAGED,
      reason: "First message",
      triggeredBy: "system",
      correlationId: "corr-2",
    });
    journey.clearUncommittedEvents();

    journey.detectRisk({
      factors: [RISK_FACTORS.NO_SHOW],
      correlationId: "corr-3",
    });

    expect(journey.getRiskScore()).toBeGreaterThan(0);
    // RiskDetected + JourneyStageChanged (to AT_RISK)
    expect(journey.getUncommittedEvents()).toHaveLength(2);
  });

  it("should reach milestone", () => {
    const journey = createTestJourney();
    journey.clearUncommittedEvents();

    journey.reachMilestone({ milestone: "first_message", correlationId: "corr-2" });

    expect(journey.getMilestones()).toContain("first_message");
  });

  it("should not reach same milestone twice", () => {
    const journey = createTestJourney();
    journey.reachMilestone({ milestone: "first_message", correlationId: "corr-2" });
    journey.clearUncommittedEvents();

    journey.reachMilestone({ milestone: "first_message", correlationId: "corr-3" });

    expect(journey.getUncommittedEvents()).toHaveLength(0);
  });

  it("should reconstruct from history", () => {
    const journey = PatientJourney.start({
      journeyId: "j-1",
      patientId: "patient-1",
      tenantId: "tenant-1",
      clinicId: "clinic-1",
      correlationId: "corr-1",
    });

    const events = journey.getUncommittedEvents();
    const reconstructed = new (PatientJourney as any)();
    reconstructed.loadFromHistory(events);

    expect(reconstructed.getCurrentStage()).toBe(JourneyStage.LEAD);
    expect(reconstructed.getPatientId()).toBe("patient-1");
  });
});

function createTestJourney(): PatientJourney {
  return PatientJourney.start({
    journeyId: "j-1",
    patientId: "patient-1",
    tenantId: "tenant-1",
    clinicId: "clinic-1",
    correlationId: "corr-1",
  });
}
```

## Checklist de Implementacao

- [x] Criar Drizzle schema `patient-journey-view.schema.ts` ✅
- [x] Exportar no `schema/index.ts` e gerar migration ✅
- [x] Definir JourneyStage enum e transicoes validas ✅
- [x] Implementar funcoes de risk score (calculateRiskScore, getRiskLevel) ✅
- [x] Criar factory functions para todos os 5 eventos ✅
- [x] Implementar PatientJourney Aggregate com state machine ✅
- [x] Implementar JourneyProjectionHandler com eventBus.subscribe() ✅
- [x] Implementar PatientJourneyProcessManager com eventBus.subscribe() ✅
- [x] Criar PatientJourneyService ✅
- [x] Criar PatientJourneyController (API read-only) ✅
- [x] Configurar PatientJourneyModule ✅
- [x] Registrar no AppModule ✅
- [x] Rodar migration ✅
- [x] Criar testes unitarios do agregado ✅ (15 testes passando)
- [x] Criar testes das funcoes de risk score ✅ (15 testes passando)
- [ ] Criar testes do process manager (com mocks)
- [ ] Validar orquestracao entre agregados

## Resultado Esperado

1. Agregado PatientJourney com state machine funcionando
2. Calculo de risco automatico baseado em comportamentos
3. Process Manager orquestrando eventos entre agregados
4. Projection patient_journey_view atualizada via Drizzle
5. Milestones sendo rastreados automaticamente
6. Transicoes de estagio validadas e registradas
7. Todos os testes passando

**Validacao:**
1. Criar patient -> journey inicia em LEAD
2. Enviar mensagem -> journey transiciona para ENGAGED
3. Agendar consulta -> journey transiciona para SCHEDULED
4. Confirmar consulta -> journey transiciona para CONFIRMED
5. No-show -> detecta risco alto e marca como AT_RISK
6. Cancelar 2x -> detecta risco e marca como AT_RISK
7. Completar consulta -> journey transiciona para IN_TREATMENT

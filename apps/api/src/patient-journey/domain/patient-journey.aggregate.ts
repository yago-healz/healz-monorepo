import { AggregateRoot } from "../../infrastructure/event-sourcing/domain/aggregate-root";
import { DomainEvent } from "../../infrastructure/event-sourcing/domain/domain-event.interface";
import {
  createJourneyMilestoneReachedEvent,
  JourneyMilestoneReachedData,
} from "./events/journey-milestone-reached.event";
import {
  createJourneyStageChangedEvent,
  JourneyStageChangedData,
} from "./events/journey-stage-changed.event";
import {
  createJourneyStartedEvent,
  JourneyStartedData,
} from "./events/journey-started.event";
import {
  createRiskDetectedEvent,
  RiskDetectedData,
} from "./events/risk-detected.event";
import {
  createRiskScoreRecalculatedEvent,
  RiskScoreRecalculatedData,
} from "./events/risk-score-recalculated.event";
import { JourneyStage, STAGE_TRANSITIONS } from "./journey-stage";
import { calculateRiskScore, getRiskLevel, RiskFactor } from "./risk-score";

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
        this.applyRiskRecalculated(
          event.event_data as RiskScoreRecalculatedData,
        );
        break;
      case "JourneyMilestoneReached":
        this.applyMilestoneReached(
          event.event_data as JourneyMilestoneReachedData,
        );
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
    this.stageHistory.push({
      stage: data.initial_stage,
      timestamp: new Date().toISOString(),
    });
  }

  private applyStageChanged(data: JourneyStageChangedData): void {
    this.currentStage = data.new_stage as JourneyStage;
    this.stageHistory.push({
      stage: data.new_stage,
      timestamp: new Date().toISOString(),
    });
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
  getPatientId(): string {
    return this.patientId;
  }
  getTenantId(): string {
    return this.tenantId;
  }
  getClinicId(): string {
    return this.clinicId;
  }
  getCurrentStage(): JourneyStage {
    return this.currentStage;
  }
  getRiskScore(): number {
    return this.riskScore;
  }
  getRiskLevel(): string {
    return getRiskLevel(this.riskScore);
  }
  getMilestones(): string[] {
    return Array.from(this.milestones);
  }
  getStageHistory(): Array<{ stage: string; timestamp: string }> {
    return [...this.stageHistory];
  }
}

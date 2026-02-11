import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { patientJourneyView } from "../../../db/schema/patient-journey-view.schema";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { getRiskLevel } from "../../domain/risk-score";

@Injectable()
export class JourneyProjectionHandler implements OnModuleInit {
  private readonly logger = new Logger(JourneyProjectionHandler.name);

  constructor(@Inject("IEventBus") private readonly eventBus: IEventBus) {}

  onModuleInit() {
    this.eventBus.subscribe("JourneyStarted", {
      handle: (event) => this.onJourneyStarted(event),
    });
    this.eventBus.subscribe("JourneyStageChanged", {
      handle: (event) => this.onStageChanged(event),
    });
    this.eventBus.subscribe("RiskDetected", {
      handle: (event) => this.onRiskDetected(event),
    });
    this.eventBus.subscribe("RiskScoreRecalculated", {
      handle: (event) => this.onRiskRecalculated(event),
    });
    this.eventBus.subscribe("JourneyMilestoneReached", {
      handle: (event) => this.onMilestoneReached(event),
    });
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
      stageHistory: [
        { stage: data.initial_stage, timestamp: event.created_at },
      ],
      createdAt: event.created_at,
      updatedAt: event.created_at,
    });
  }

  private async onStageChanged(event: DomainEvent): Promise<void> {
    const data = event.event_data;

    // Buscar stageHistory atual para fazer append
    const [current] = await db
      .select({ stageHistory: patientJourneyView.stageHistory })
      .from(patientJourneyView)
      .where(eq(patientJourneyView.id, event.aggregate_id));

    const history = (current?.stageHistory as any[]) || [];
    history.push({
      stage: data.new_stage,
      timestamp: event.created_at,
      reason: data.reason,
    });

    await db
      .update(patientJourneyView)
      .set({
        currentStage: data.new_stage,
        stageHistory: history,
        updatedAt: new Date(),
      })
      .where(eq(patientJourneyView.id, event.aggregate_id));
  }

  private async onRiskDetected(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db
      .update(patientJourneyView)
      .set({
        riskScore: data.risk_score,
        riskLevel: data.risk_level,
        updatedAt: new Date(),
      })
      .where(eq(patientJourneyView.id, event.aggregate_id));
  }

  private async onRiskRecalculated(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db
      .update(patientJourneyView)
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
    const [current] = await db
      .select({ milestones: patientJourneyView.milestones })
      .from(patientJourneyView)
      .where(eq(patientJourneyView.id, event.aggregate_id));

    const milestones = (current?.milestones as any[]) || [];
    milestones.push({
      milestone: data.milestone,
      reached_at: data.reached_at,
    });

    await db
      .update(patientJourneyView)
      .set({
        milestones,
        updatedAt: new Date(),
      })
      .where(eq(patientJourneyView.id, event.aggregate_id));
  }
}

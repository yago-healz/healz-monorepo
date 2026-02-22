import { randomUUID } from "crypto";
import { DomainEvent } from "../../../infrastructure/event-sourcing/domain/domain-event.interface";

export interface JourneyMilestoneReachedData {
  journey_id: string;
  milestone: string; // "first_message", "first_appointment", "treatment_completed", etc.
  reached_at: string; // ISO 8601
}

export function createJourneyMilestoneReachedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  data: JourneyMilestoneReachedData;
}): DomainEvent<JourneyMilestoneReachedData> {
  return {
    event_id: randomUUID(),
    event_type: "JourneyMilestoneReached",
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

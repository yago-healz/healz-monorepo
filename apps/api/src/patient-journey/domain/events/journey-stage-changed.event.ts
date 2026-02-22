import { randomUUID } from "crypto";
import { DomainEvent } from "../../../infrastructure/event-sourcing/domain/domain-event.interface";

export interface JourneyStageChangedData {
  journey_id: string;
  previous_stage: string;
  new_stage: string;
  reason: string;
  triggered_by: string; // eventId or userId
}

export function createJourneyStageChangedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  data: JourneyStageChangedData;
}): DomainEvent<JourneyStageChangedData> {
  return {
    event_id: randomUUID(),
    event_type: "JourneyStageChanged",
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

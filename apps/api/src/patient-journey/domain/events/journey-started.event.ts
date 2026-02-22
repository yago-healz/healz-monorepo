import { randomUUID } from "crypto";
import { DomainEvent } from "../../../infrastructure/event-sourcing/domain/domain-event.interface";

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

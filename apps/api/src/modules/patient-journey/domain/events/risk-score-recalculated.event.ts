import { randomUUID } from "crypto";
import { DomainEvent } from "../../../../infrastructure/event-sourcing/domain/domain-event.interface";
import { RiskFactor } from "../risk-score";

export interface RiskScoreRecalculatedData {
  journey_id: string;
  previous_score: number;
  new_score: number;
  factors: RiskFactor[];
}

export function createRiskScoreRecalculatedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  data: RiskScoreRecalculatedData;
}): DomainEvent<RiskScoreRecalculatedData> {
  return {
    event_id: randomUUID(),
    event_type: "RiskScoreRecalculated",
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

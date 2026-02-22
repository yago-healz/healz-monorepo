import { randomUUID } from "crypto";
import { DomainEvent } from "../../../../infrastructure/event-sourcing/domain/domain-event.interface";
import { RiskFactor } from "../risk-score";

export interface RiskDetectedData {
  journey_id: string;
  risk_factors: RiskFactor[];
  risk_score: number;
  risk_level: string;
}

export function createRiskDetectedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  data: RiskDetectedData;
}): DomainEvent<RiskDetectedData> {
  return {
    event_id: randomUUID(),
    event_type: "RiskDetected",
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

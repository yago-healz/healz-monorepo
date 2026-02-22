import { randomUUID } from "crypto";
import { DomainEvent } from "../../../infrastructure/event-sourcing/domain/domain-event.interface";

export interface PatientUpdatedData {
  patient_id: string;
  updates: {
    full_name?: string;
    email?: string;
    birth_date?: string;
  };
}

export function createPatientUpdatedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  data: PatientUpdatedData;
}): DomainEvent<PatientUpdatedData> {
  return {
    event_id: randomUUID(),
    event_type: "PatientUpdated",
    aggregate_type: "Patient",
    aggregate_id: params.aggregateId,
    aggregate_version: params.aggregateVersion,
    tenant_id: params.tenantId,
    clinic_id: params.clinicId,
    correlation_id: params.correlationId,
    causation_id: params.causationId,
    user_id: params.userId,
    created_at: new Date(),
    event_data: params.data,
  };
}

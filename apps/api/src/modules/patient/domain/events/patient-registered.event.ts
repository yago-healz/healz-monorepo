import { randomUUID } from "crypto";
import { DomainEvent } from "../../../../infrastructure/event-sourcing/domain/domain-event.interface";

export interface PatientRegisteredData {
  patient_id: string;
  tenant_id: string;
  clinic_id: string;
  phone: string;
  full_name?: string;
  email?: string;
  birth_date?: string;
}

export function createPatientRegisteredEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  data: PatientRegisteredData;
}): DomainEvent<PatientRegisteredData> {
  return {
    event_id: randomUUID(),
    event_type: "PatientRegistered",
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

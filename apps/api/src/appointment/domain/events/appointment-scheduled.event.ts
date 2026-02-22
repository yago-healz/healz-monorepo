import { randomUUID } from "crypto";
import { DomainEvent } from "../../../infrastructure/event-sourcing/domain/domain-event.interface";

export interface AppointmentScheduledData {
  appointment_id: string;
  patient_id: string;
  clinic_id: string;
  tenant_id: string;
  doctor_id: string;
  scheduled_at: string; // ISO 8601
  duration: number;
  reason?: string;
  notes?: string;
}

export function createAppointmentScheduledEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  data: AppointmentScheduledData;
}): DomainEvent<AppointmentScheduledData> {
  return {
    event_id: randomUUID(),
    event_type: "AppointmentScheduled",
    aggregate_type: "Appointment",
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

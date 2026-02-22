import { randomUUID } from "crypto";
import { DomainEvent } from "../../../infrastructure/event-sourcing/domain/domain-event.interface";

export interface AppointmentCompletedData {
  appointment_id: string;
  completed_at: string;
  notes?: string;
}

export function createAppointmentCompletedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  data: AppointmentCompletedData;
}): DomainEvent<AppointmentCompletedData> {
  return {
    event_id: randomUUID(),
    event_type: "AppointmentCompleted",
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

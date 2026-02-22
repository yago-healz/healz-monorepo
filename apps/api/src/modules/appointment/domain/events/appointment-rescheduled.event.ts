import { randomUUID } from "crypto";
import { DomainEvent } from "../../../../infrastructure/event-sourcing/domain/domain-event.interface";

export interface AppointmentRescheduledData {
  appointment_id: string;
  previous_scheduled_at: string;
  new_scheduled_at: string;
  rescheduled_at: string;
  rescheduled_by: string;
  reason?: string;
}

export function createAppointmentRescheduledEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  data: AppointmentRescheduledData;
}): DomainEvent<AppointmentRescheduledData> {
  return {
    event_id: randomUUID(),
    event_type: "AppointmentRescheduled",
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

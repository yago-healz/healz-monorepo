import { randomUUID } from "crypto";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";

export interface AppointmentCancelledData {
  appointment_id: string;
  cancelled_at: string;
  cancelled_by: string;
  reason?: string;
}

export function createAppointmentCancelledEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  data: AppointmentCancelledData;
}): DomainEvent<AppointmentCancelledData> {
  return {
    event_id: randomUUID(),
    event_type: "AppointmentCancelled",
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

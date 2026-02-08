import { randomUUID } from "crypto";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";

export interface AppointmentConfirmedData {
  appointment_id: string;
  confirmed_at: string;
  confirmed_by: string;
}

export function createAppointmentConfirmedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  data: AppointmentConfirmedData;
}): DomainEvent<AppointmentConfirmedData> {
  return {
    event_id: randomUUID(),
    event_type: "AppointmentConfirmed",
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

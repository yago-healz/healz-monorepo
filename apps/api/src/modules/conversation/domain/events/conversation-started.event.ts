import { randomUUID } from "crypto";
import { DomainEvent } from "../../../../infrastructure/event-sourcing/domain/domain-event.interface";

export interface ConversationStartedData {
  conversation_id: string;
  patient_id: string;
  clinic_id: string;
  tenant_id: string;
  channel: "whatsapp" | "web" | "sms";
  started_by: "patient" | "agent" | "system";
}

export function createConversationStartedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  data: ConversationStartedData;
}): DomainEvent<ConversationStartedData> {
  return {
    event_id: randomUUID(),
    event_type: "ConversationStarted",
    aggregate_type: "Conversation",
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

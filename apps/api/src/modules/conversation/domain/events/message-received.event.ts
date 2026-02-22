import { randomUUID } from "crypto";
import { DomainEvent } from "../../../../infrastructure/event-sourcing/domain/domain-event.interface";

export interface MessageReceivedData {
  conversation_id: string;
  message_id: string;
  from_phone: string;
  content: string;
  message_type: "text" | "image" | "document";
  media_url?: string;
  received_at: string; // ISO 8601
}

export function createMessageReceivedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  data: MessageReceivedData;
}): DomainEvent<MessageReceivedData> {
  return {
    event_id: randomUUID(),
    event_type: "MessageReceived",
    aggregate_type: "Conversation",
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

import { randomUUID } from "crypto";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";

export interface ConversationEscalatedData {
  conversation_id: string;
  reason: "manual_request" | "low_confidence" | "sensitive_topic" | "error";
  escalated_to_user_id?: string;
  escalated_at: string;
}

export function createConversationEscalatedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  data: ConversationEscalatedData;
}): DomainEvent<ConversationEscalatedData> {
  return {
    event_id: randomUUID(),
    event_type: "ConversationEscalated",
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

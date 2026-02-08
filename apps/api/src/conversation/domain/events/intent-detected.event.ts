import { randomUUID } from "crypto";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";

export interface IntentDetectedData {
  conversation_id: string;
  message_id: string;
  intent: string;
  confidence: number; // 0.0 to 1.0
  entities?: Record<string, any>;
  detected_at: string;
}

export function createIntentDetectedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  data: IntentDetectedData;
}): DomainEvent<IntentDetectedData> {
  return {
    event_id: randomUUID(),
    event_type: "IntentDetected",
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

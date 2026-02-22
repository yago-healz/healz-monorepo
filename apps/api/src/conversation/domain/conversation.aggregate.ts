import { AggregateRoot } from "../../infrastructure/event-sourcing/domain/aggregate-root";
import { DomainEvent } from "../../infrastructure/event-sourcing/domain/domain-event.interface";
import {
  createConversationStartedEvent,
  ConversationStartedData,
} from "./events/conversation-started.event";
import {
  createMessageReceivedEvent,
  MessageReceivedData,
} from "./events/message-received.event";
import {
  createMessageSentEvent,
  MessageSentData,
} from "./events/message-sent.event";
import {
  createIntentDetectedEvent,
  IntentDetectedData,
} from "./events/intent-detected.event";
import {
  createConversationEscalatedEvent,
  ConversationEscalatedData,
} from "./events/conversation-escalated.event";

export type ConversationStatus =
  | "active"
  | "escalated"
  | "resolved"
  | "abandoned";

export class Conversation extends AggregateRoot {
  private conversationId: string;
  private patientId: string;
  private clinicId: string;
  private tenantId: string;
  private status: ConversationStatus;
  private channel: "whatsapp" | "web" | "sms";
  private isEscalated: boolean;
  private escalatedToUserId?: string;
  private consecutiveBotMessages: number;
  private lastMessageAt?: Date;

  private constructor() {
    super();
  }

  static start(params: {
    conversationId: string;
    patientId: string;
    clinicId: string;
    tenantId: string;
    channel: "whatsapp" | "web" | "sms";
    startedBy: "patient" | "agent" | "system";
    correlationId: string;
    userId?: string;
  }): Conversation {
    const conversation = new Conversation();

    const event = createConversationStartedEvent({
      aggregateId: params.conversationId,
      aggregateVersion: 1,
      tenantId: params.tenantId,
      clinicId: params.clinicId,
      correlationId: params.correlationId,
      userId: params.userId,
      data: {
        conversation_id: params.conversationId,
        patient_id: params.patientId,
        clinic_id: params.clinicId,
        tenant_id: params.tenantId,
        channel: params.channel,
        started_by: params.startedBy,
      },
    });

    conversation.addEvent(event);
    return conversation;
  }

  receiveMessage(params: {
    messageId: string;
    fromPhone: string;
    content: string;
    messageType?: "text" | "image" | "document";
    mediaUrl?: string;
    correlationId: string;
    causationId?: string;
  }): void {
    if (this.status === "resolved") {
      throw new Error("Cannot receive message on resolved conversation");
    }

    const event = createMessageReceivedEvent({
      aggregateId: this.conversationId,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      causationId: params.causationId,
      data: {
        conversation_id: this.conversationId,
        message_id: params.messageId,
        from_phone: params.fromPhone,
        content: params.content,
        message_type: params.messageType || "text",
        media_url: params.mediaUrl,
        received_at: new Date().toISOString(),
      },
    });

    this.addEvent(event);
  }

  sendMessage(params: {
    messageId: string;
    toPhone: string;
    content: string;
    messageType?: "text" | "image" | "document";
    mediaUrl?: string;
    sentBy: "bot" | "agent" | "system";
    correlationId: string;
    causationId?: string;
  }): void {
    if (this.status === "resolved") {
      throw new Error("Cannot send message on resolved conversation");
    }

    if (params.sentBy === "bot" && this.consecutiveBotMessages >= 3) {
      throw new Error("Cannot send more than 3 consecutive bot messages");
    }

    const event = createMessageSentEvent({
      aggregateId: this.conversationId,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      causationId: params.causationId,
      data: {
        conversation_id: this.conversationId,
        message_id: params.messageId,
        to_phone: params.toPhone,
        content: params.content,
        message_type: params.messageType || "text",
        media_url: params.mediaUrl,
        sent_by: params.sentBy,
        sent_at: new Date().toISOString(),
      },
    });

    this.addEvent(event);
  }

  detectIntent(params: {
    messageId: string;
    intent: string;
    confidence: number;
    entities?: Record<string, any>;
    correlationId: string;
    causationId?: string;
  }): void {
    const event = createIntentDetectedEvent({
      aggregateId: this.conversationId,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      causationId: params.causationId,
      data: {
        conversation_id: this.conversationId,
        message_id: params.messageId,
        intent: params.intent,
        confidence: params.confidence,
        entities: params.entities,
        detected_at: new Date().toISOString(),
      },
    });

    this.addEvent(event);
  }

  escalate(params: {
    reason: "manual_request" | "low_confidence" | "sensitive_topic" | "error";
    escalatedToUserId?: string;
    correlationId: string;
    causationId?: string;
  }): void {
    if (this.isEscalated) {
      throw new Error("Conversation already escalated");
    }

    const event = createConversationEscalatedEvent({
      aggregateId: this.conversationId,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      causationId: params.causationId,
      data: {
        conversation_id: this.conversationId,
        reason: params.reason,
        escalated_to_user_id: params.escalatedToUserId,
        escalated_at: new Date().toISOString(),
      },
    });

    this.addEvent(event);
  }

  // applyEvent - metodo padrao do AggregateRoot
  protected applyEvent(event: DomainEvent): void {
    switch (event.event_type) {
      case "ConversationStarted":
        this.applyConversationStarted(
          event.event_data as ConversationStartedData,
        );
        break;
      case "MessageReceived":
        this.applyMessageReceived(event.event_data as MessageReceivedData);
        break;
      case "MessageSent":
        this.applyMessageSent(event.event_data as MessageSentData);
        break;
      case "IntentDetected":
        // State nao muda, apenas registra
        break;
      case "ConversationEscalated":
        this.applyConversationEscalated(
          event.event_data as ConversationEscalatedData,
        );
        break;
    }
  }

  private applyConversationStarted(data: ConversationStartedData): void {
    this.id = data.conversation_id;
    this.conversationId = data.conversation_id;
    this.patientId = data.patient_id;
    this.clinicId = data.clinic_id;
    this.tenantId = data.tenant_id;
    this.channel = data.channel;
    this.status = "active";
    this.isEscalated = false;
    this.consecutiveBotMessages = 0;
  }

  private applyMessageReceived(data: MessageReceivedData): void {
    this.consecutiveBotMessages = 0;
    this.lastMessageAt = new Date(data.received_at);
  }

  private applyMessageSent(data: MessageSentData): void {
    if (data.sent_by === "bot") {
      this.consecutiveBotMessages++;
    } else {
      this.consecutiveBotMessages = 0;
    }
    this.lastMessageAt = new Date(data.sent_at);
  }

  private applyConversationEscalated(data: ConversationEscalatedData): void {
    this.isEscalated = true;
    this.status = "escalated";
    this.escalatedToUserId = data.escalated_to_user_id;
  }

  // Getters
  getConversationId(): string {
    return this.conversationId;
  }
  getPatientId(): string {
    return this.patientId;
  }
  getTenantId(): string {
    return this.tenantId;
  }
  getClinicId(): string {
    return this.clinicId;
  }
  getStatus(): ConversationStatus {
    return this.status;
  }
  isEscalatedToHuman(): boolean {
    return this.isEscalated;
  }
}

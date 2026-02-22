import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../../infrastructure/database";
import {
  conversationView,
  messageView,
} from "../../../../infrastructure/database/schema/conversation-view.schema";
import { DomainEvent } from "../../../../infrastructure/event-sourcing/domain/domain-event.interface";
import { IEventBus } from "../../../../infrastructure/event-sourcing/event-bus/event-bus.interface";
import { ConversationStartedData } from "../../domain/events/conversation-started.event";
import { MessageReceivedData } from "../../domain/events/message-received.event";
import { MessageSentData } from "../../domain/events/message-sent.event";
import { IntentDetectedData } from "../../domain/events/intent-detected.event";
import { ConversationEscalatedData } from "../../domain/events/conversation-escalated.event";

@Injectable()
export class ConversationProjectionHandler implements OnModuleInit {
  private readonly logger = new Logger(ConversationProjectionHandler.name);

  constructor(@Inject("IEventBus") private readonly eventBus: IEventBus) {}

  onModuleInit() {
    this.eventBus.subscribe("ConversationStarted", {
      handle: (event) => this.onConversationStarted(event),
    });
    this.eventBus.subscribe("MessageReceived", {
      handle: (event) => this.onMessageReceived(event),
    });
    this.eventBus.subscribe("MessageSent", {
      handle: (event) => this.onMessageSent(event),
    });
    this.eventBus.subscribe("IntentDetected", {
      handle: (event) => this.onIntentDetected(event),
    });
    this.eventBus.subscribe("ConversationEscalated", {
      handle: (event) => this.onConversationEscalated(event),
    });
  }

  private async onConversationStarted(
    event: DomainEvent<ConversationStartedData>,
  ): Promise<void> {
    const data = event.event_data;
    await db.insert(conversationView).values({
      id: data.conversation_id,
      patientId: data.patient_id,
      tenantId: data.tenant_id,
      clinicId: data.clinic_id,
      status: "active",
      channel: data.channel,
      isEscalated: false,
      messageCount: 0,
      createdAt: event.created_at,
      updatedAt: event.created_at,
    });
  }

  private async onMessageReceived(
    event: DomainEvent<MessageReceivedData>,
  ): Promise<void> {
    const data = event.event_data;

    // Inserir na message_view
    await db.insert(messageView).values({
      id: data.message_id,
      conversationId: data.conversation_id,
      direction: "incoming",
      fromPhone: data.from_phone,
      content: data.content,
      messageType: data.message_type,
      mediaUrl: data.media_url || null,
      sentBy: "patient",
      createdAt: new Date(data.received_at),
    });

    // Atualizar conversation_view
    await db
      .update(conversationView)
      .set({
        lastMessageAt: new Date(data.received_at),
        messageCount: sql`${conversationView.messageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(conversationView.id, data.conversation_id));
  }

  private async onMessageSent(
    event: DomainEvent<MessageSentData>,
  ): Promise<void> {
    const data = event.event_data;

    await db.insert(messageView).values({
      id: data.message_id,
      conversationId: data.conversation_id,
      direction: "outgoing",
      toPhone: data.to_phone,
      content: data.content,
      messageType: data.message_type,
      mediaUrl: data.media_url || null,
      sentBy: data.sent_by,
      createdAt: new Date(data.sent_at),
    });

    await db
      .update(conversationView)
      .set({
        lastMessageAt: new Date(data.sent_at),
        messageCount: sql`${conversationView.messageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(conversationView.id, data.conversation_id));
  }

  private async onIntentDetected(
    event: DomainEvent<IntentDetectedData>,
  ): Promise<void> {
    const data = event.event_data;

    // Atualizar a mensagem com o intent detectado
    await db
      .update(messageView)
      .set({
        intent: data.intent,
        intentConfidence: data.confidence.toFixed(2),
      })
      .where(eq(messageView.id, data.message_id));
  }

  private async onConversationEscalated(
    event: DomainEvent<ConversationEscalatedData>,
  ): Promise<void> {
    const data = event.event_data;

    await db
      .update(conversationView)
      .set({
        status: "escalated",
        isEscalated: true,
        escalatedToUserId: data.escalated_to_user_id || null,
        escalatedAt: new Date(data.escalated_at),
        updatedAt: new Date(),
      })
      .where(eq(conversationView.id, data.conversation_id));
  }
}

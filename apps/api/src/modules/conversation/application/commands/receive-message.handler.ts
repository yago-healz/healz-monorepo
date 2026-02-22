import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import { IEventStore } from "../../../../infrastructure/event-sourcing/event-store/event-store.interface";
import { IEventBus } from "../../../../infrastructure/event-sourcing/event-bus/event-bus.interface";
import { IIntentDetector } from "../../../carol/domain/intent-detector.interface";
import { Conversation } from "../../domain/conversation.aggregate";
import { CorrelationUtil } from "../../../../infrastructure/event-sourcing/utils/correlation.util";

@Injectable()
export class ReceiveMessageHandler {
  constructor(
    @Inject("IEventStore") private readonly eventStore: IEventStore,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
    @Inject("IIntentDetector") private readonly intentDetector: IIntentDetector,
  ) {}

  async execute(command: {
    conversationId: string;
    patientId: string;
    clinicId: string;
    tenantId: string;
    fromPhone: string;
    content: string;
    messageType?: "text" | "image" | "document";
  }): Promise<void> {
    const correlationId = CorrelationUtil.generate("receive-message");

    // Carregar ou criar conversa
    let conversation: Conversation;
    const existingEvents = await this.eventStore.getByAggregateId(
      "Conversation",
      command.conversationId,
    );

    if (existingEvents.length === 0) {
      conversation = Conversation.start({
        conversationId: command.conversationId,
        patientId: command.patientId,
        clinicId: command.clinicId,
        tenantId: command.tenantId,
        channel: "whatsapp",
        startedBy: "patient",
        correlationId,
      });
    } else {
      conversation = new (Conversation as any)();
      conversation.loadFromHistory(existingEvents);
    }

    // Receber mensagem
    const messageId = randomUUID();
    conversation.receiveMessage({
      messageId,
      fromPhone: command.fromPhone,
      content: command.content,
      messageType: command.messageType,
      correlationId,
    });

    // Detectar intencao (mock por enquanto)
    const detection = await this.intentDetector.detectIntent(command.content);

    if (detection.intent !== "unknown") {
      conversation.detectIntent({
        messageId,
        intent: detection.intent,
        confidence: detection.confidence,
        entities: detection.entities,
        correlationId,
        causationId: messageId,
      });
    }

    // Salvar e publicar eventos
    const events = conversation.getUncommittedEvents();
    await this.eventStore.appendMany(events);
    await this.eventBus.publishMany(events);
  }
}

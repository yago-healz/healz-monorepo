# Fase 4: Conversation Aggregate

## Objetivo

Implementar o agregado Conversation que gerencia a comunicacao entre pacientes e o sistema via WhatsApp, incluindo deteccao de intencoes e gerenciamento de contexto conversacional.

## Pre-requisitos

- Fase 1 concluida (Event Store Foundation)
- Fase 2 concluida (Patient Aggregate)

## Escopo

### O que sera implementado

1. **Agregado Conversation** - Logica de conversas
2. **Eventos** - ConversationStarted, MessageReceived, MessageSent, IntentDetected, ConversationEscalated
3. **Projection** - conversation_view, message_view (Drizzle schemas)
4. **Projection Handlers** - Atualizam projections via eventBus.subscribe()
5. **Command Handlers** - Processam comandos
6. **API REST temporaria** - Para testes

### O que NAO sera implementado

- IA real para deteccao de intencoes (Fase 5 - Carol Mock)
- Integracao WhatsApp real (Fase 8)
- Jornada do paciente (Fase 7)

## Estrutura de Arquivos

```
apps/api/src/
+-- db/schema/
|   +-- conversation-view.schema.ts   # NOVO - Projection tables
|   +-- index.ts                      # Atualizar com export
+-- conversation/
|   +-- conversation.module.ts
|   +-- domain/
|   |   +-- conversation.aggregate.ts
|   |   +-- events/
|   |       +-- conversation-started.event.ts
|   |       +-- message-received.event.ts
|   |       +-- message-sent.event.ts
|   |       +-- intent-detected.event.ts
|   |       +-- conversation-escalated.event.ts
|   +-- application/
|   |   +-- commands/
|   |   |   +-- receive-message.handler.ts
|   |   +-- event-handlers/
|   |       +-- conversation-projection.handler.ts
|   +-- api/
|       +-- conversation.controller.ts
|       +-- dtos/
|           +-- receive-message.dto.ts
```

## Projection Schemas (Drizzle)

```typescript
// src/db/schema/conversation-view.schema.ts

import {
  pgTable, uuid, varchar, boolean, integer,
  timestamp, text, decimal, index,
} from "drizzle-orm/pg-core";

export const conversationView = pgTable("conversation_view", {
  id: uuid("id").primaryKey(),
  patientId: uuid("patient_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  clinicId: uuid("clinic_id").notNull(),

  status: varchar("status", { length: 20 }).notNull().default("active"),
  channel: varchar("channel", { length: 20 }).notNull(),

  isEscalated: boolean("is_escalated").default(false),
  escalatedToUserId: uuid("escalated_to_user_id"),
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),

  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  messageCount: integer("message_count").default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("idx_conversation_view_patient").on(table.patientId),
  index("idx_conversation_view_tenant").on(table.tenantId),
  index("idx_conversation_view_status").on(table.status),
  index("idx_conversation_view_escalated").on(table.isEscalated),
]);

export const messageView = pgTable("message_view", {
  id: uuid("id").primaryKey(),
  conversationId: uuid("conversation_id").notNull(),

  direction: varchar("direction", { length: 10 }).notNull(), // 'incoming' | 'outgoing'
  fromPhone: varchar("from_phone", { length: 20 }),
  toPhone: varchar("to_phone", { length: 20 }),

  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 20 }).default("text"),
  mediaUrl: text("media_url"),

  sentBy: varchar("sent_by", { length: 20 }), // 'bot' | 'agent' | 'system' | 'patient'

  intent: varchar("intent", { length: 50 }),
  intentConfidence: decimal("intent_confidence", { precision: 3, scale: 2 }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("idx_message_view_conversation").on(table.conversationId),
  index("idx_message_view_created_at").on(table.createdAt),
  index("idx_message_view_intent").on(table.intent),
]);
```

**Nota:** Adicionar `export * from "./conversation-view.schema"` no `src/db/schema/index.ts` e rodar migration.

## Eventos

Todos seguem o padrao factory function retornando `DomainEvent<T>`.

```typescript
// domain/events/conversation-started.event.ts

import { randomUUID } from "crypto";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";

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
```

```typescript
// domain/events/message-received.event.ts

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
```

```typescript
// domain/events/message-sent.event.ts

export interface MessageSentData {
  conversation_id: string;
  message_id: string;
  to_phone: string;
  content: string;
  message_type: "text" | "image" | "document";
  media_url?: string;
  sent_by: "bot" | "agent" | "system";
  sent_at: string;
}

// Mesmo padrao factory function - createMessageSentEvent(...)
```

```typescript
// domain/events/intent-detected.event.ts

export interface IntentDetectedData {
  conversation_id: string;
  message_id: string;
  intent: string;
  confidence: number; // 0.0 to 1.0
  entities?: Record<string, any>;
  detected_at: string;
}

// Mesmo padrao factory function - createIntentDetectedEvent(...)
```

```typescript
// domain/events/conversation-escalated.event.ts

export interface ConversationEscalatedData {
  conversation_id: string;
  reason: "manual_request" | "low_confidence" | "sensitive_topic" | "error";
  escalated_to_user_id?: string;
  escalated_at: string;
}

// Mesmo padrao factory function - createConversationEscalatedEvent(...)
```

## Agregado Conversation

```typescript
// domain/conversation.aggregate.ts

import { AggregateRoot } from "../../event-sourcing/domain/aggregate-root";
import { DomainEvent } from "../../event-sourcing/domain/domain-event.interface";
import { createConversationStartedEvent, ConversationStartedData } from "./events/conversation-started.event";
import { createMessageReceivedEvent, MessageReceivedData } from "./events/message-received.event";
import { createMessageSentEvent, MessageSentData } from "./events/message-sent.event";
import { createIntentDetectedEvent, IntentDetectedData } from "./events/intent-detected.event";
import { createConversationEscalatedEvent, ConversationEscalatedData } from "./events/conversation-escalated.event";

export type ConversationStatus = "active" | "escalated" | "resolved" | "abandoned";

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
        this.applyConversationStarted(event.event_data as ConversationStartedData);
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
        this.applyConversationEscalated(event.event_data as ConversationEscalatedData);
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
  getConversationId(): string { return this.conversationId; }
  getPatientId(): string { return this.patientId; }
  getTenantId(): string { return this.tenantId; }
  getClinicId(): string { return this.clinicId; }
  getStatus(): ConversationStatus { return this.status; }
  isEscalatedToHuman(): boolean { return this.isEscalated; }
}
```

## Projection Handler

```typescript
// application/event-handlers/conversation-projection.handler.ts

import { Injectable, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { conversationView, messageView } from "../../../db/schema/conversation-view.schema";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";

@Injectable()
export class ConversationProjectionHandler implements OnModuleInit {
  private readonly logger = new Logger(ConversationProjectionHandler.name);

  constructor(@Inject("IEventBus") private readonly eventBus: IEventBus) {}

  onModuleInit() {
    this.eventBus.subscribe("ConversationStarted", (event) => this.onConversationStarted(event));
    this.eventBus.subscribe("MessageReceived", (event) => this.onMessageReceived(event));
    this.eventBus.subscribe("MessageSent", (event) => this.onMessageSent(event));
    this.eventBus.subscribe("IntentDetected", (event) => this.onIntentDetected(event));
    this.eventBus.subscribe("ConversationEscalated", (event) => this.onConversationEscalated(event));
  }

  private async onConversationStarted(event: DomainEvent): Promise<void> {
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

  private async onMessageReceived(event: DomainEvent): Promise<void> {
    const data = event.event_data;

    // Inserir na message_view
    await db.insert(messageView).values({
      id: data.message_id,
      conversationId: data.conversation_id,
      direction: "incoming",
      fromPhone: data.from_phone,
      content: data.content,
      messageType: data.message_type,
      mediaUrl: data.media_url,
      sentBy: "patient",
      createdAt: new Date(data.received_at),
    });

    // Atualizar conversation_view
    await db.update(conversationView)
      .set({
        lastMessageAt: new Date(data.received_at),
        messageCount: sql`${conversationView.messageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(conversationView.id, data.conversation_id));
  }

  private async onMessageSent(event: DomainEvent): Promise<void> {
    const data = event.event_data;

    await db.insert(messageView).values({
      id: data.message_id,
      conversationId: data.conversation_id,
      direction: "outgoing",
      toPhone: data.to_phone,
      content: data.content,
      messageType: data.message_type,
      mediaUrl: data.media_url,
      sentBy: data.sent_by,
      createdAt: new Date(data.sent_at),
    });

    await db.update(conversationView)
      .set({
        lastMessageAt: new Date(data.sent_at),
        messageCount: sql`${conversationView.messageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(conversationView.id, data.conversation_id));
  }

  private async onIntentDetected(event: DomainEvent): Promise<void> {
    const data = event.event_data;

    // Atualizar a mensagem com o intent detectado
    await db.update(messageView)
      .set({
        intent: data.intent,
        intentConfidence: data.confidence.toString(),
      })
      .where(eq(messageView.id, data.message_id));
  }

  private async onConversationEscalated(event: DomainEvent): Promise<void> {
    const data = event.event_data;

    await db.update(conversationView)
      .set({
        status: "escalated",
        isEscalated: true,
        escalatedToUserId: data.escalated_to_user_id,
        escalatedAt: new Date(data.escalated_at),
        updatedAt: new Date(),
      })
      .where(eq(conversationView.id, data.conversation_id));
  }
}
```

**Nota:** Importar `sql` de `drizzle-orm` para expressoes SQL inline.

## Command Handler

```typescript
// application/commands/receive-message.handler.ts

import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import { IEventStore } from "../../../event-sourcing/event-store/event-store.interface";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { IIntentDetector } from "../../../carol/domain/intent-detector.interface";
import { Conversation } from "../../domain/conversation.aggregate";
import { CorrelationUtil } from "../../../event-sourcing/utils/correlation.util";

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
```

## API REST (Temporaria)

```typescript
// api/conversation.controller.ts

import { Controller, Get, Post, Body, Param, Query, Inject } from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../../db";
import { conversationView, messageView } from "../../../db/schema/conversation-view.schema";
import { ReceiveMessageHandler } from "../application/commands/receive-message.handler";

@Controller("conversations")
export class ConversationController {
  constructor(
    private readonly receiveMessageHandler: ReceiveMessageHandler,
  ) {}

  @Post("receive")
  async receiveMessage(@Body() dto: ReceiveMessageDto) {
    await this.receiveMessageHandler.execute({
      conversationId: dto.conversationId || randomUUID(),
      patientId: dto.patientId,
      clinicId: dto.clinicId,
      tenantId: dto.tenantId,
      fromPhone: dto.fromPhone,
      content: dto.content,
      messageType: dto.messageType,
    });
    return { success: true };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const [result] = await db.select()
      .from(conversationView)
      .where(eq(conversationView.id, id));

    if (!result) throw new NotFoundException("Conversation not found");
    return result;
  }

  @Get(":id/messages")
  async getMessages(@Param("id") id: string) {
    const messages = await db.select()
      .from(messageView)
      .where(eq(messageView.conversationId, id))
      .orderBy(desc(messageView.createdAt));

    return messages;
  }

  @Get()
  async findAll(@Query("patientId") patientId?: string) {
    const conditions = [];
    if (patientId) conditions.push(eq(conversationView.patientId, patientId));

    const conversations = await db.select()
      .from(conversationView)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(conversationView.updatedAt));

    return conversations;
  }
}
```

## Module Configuration

```typescript
// conversation.module.ts

import { Module } from "@nestjs/common";
import { ConversationController } from "./api/conversation.controller";
import { ReceiveMessageHandler } from "./application/commands/receive-message.handler";
import { ConversationProjectionHandler } from "./application/event-handlers/conversation-projection.handler";

@Module({
  controllers: [ConversationController],
  providers: [
    ReceiveMessageHandler,
    ConversationProjectionHandler,
  ],
  exports: [ReceiveMessageHandler],
})
export class ConversationModule {}
```

**Nota:** Adicionar `ConversationModule` nos imports do `AppModule`. Depende de `EventSourcingModule` (global) e `CarolModule` para `IIntentDetector`.

## Testes

### Testes do Agregado

```typescript
describe("Conversation Aggregate", () => {
  it("should start new conversation", () => {
    const conversation = Conversation.start({
      conversationId: "conv-123",
      patientId: "patient-123",
      clinicId: "clinic-1",
      tenantId: "tenant-1",
      channel: "whatsapp",
      startedBy: "patient",
      correlationId: "corr-1",
    });

    const events = conversation.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("ConversationStarted");
  });

  it("should receive message", () => {
    const conversation = createTestConversation();
    conversation.clearUncommittedEvents();

    conversation.receiveMessage({
      messageId: "msg-1",
      fromPhone: "+5511999999999",
      content: "Ola",
      correlationId: "corr-2",
    });

    const events = conversation.getUncommittedEvents();
    expect(events[0].event_type).toBe("MessageReceived");
  });

  it("should not allow more than 3 consecutive bot messages", () => {
    const conversation = createTestConversation();

    for (let i = 0; i < 3; i++) {
      conversation.sendMessage({
        messageId: randomUUID(),
        toPhone: "+5511999999999",
        content: `Bot msg ${i}`,
        sentBy: "bot",
        correlationId: "corr-1",
      });
    }

    expect(() => {
      conversation.sendMessage({
        messageId: randomUUID(),
        toPhone: "+5511999999999",
        content: "Bot msg 4",
        sentBy: "bot",
        correlationId: "corr-1",
      });
    }).toThrow("Cannot send more than 3 consecutive bot messages");
  });

  it("should escalate conversation", () => {
    const conversation = createTestConversation();
    conversation.clearUncommittedEvents();

    conversation.escalate({
      reason: "manual_request",
      correlationId: "corr-3",
    });

    expect(conversation.getStatus()).toBe("escalated");
    expect(conversation.isEscalatedToHuman()).toBe(true);
  });

  it("should not escalate already escalated conversation", () => {
    const conversation = createTestConversation();
    conversation.escalate({ reason: "manual_request", correlationId: "corr-1" });

    expect(() => {
      conversation.escalate({ reason: "error", correlationId: "corr-2" });
    }).toThrow("Conversation already escalated");
  });
});
```

## Checklist de Implementacao

- [ ] Criar Drizzle schema para conversation_view e message_view
- [ ] Criar factory functions para todos os eventos
- [ ] Implementar agregado Conversation
- [ ] Implementar ConversationProjectionHandler com eventBus.subscribe()
- [ ] Implementar ReceiveMessageHandler
- [ ] Criar DTOs de validacao
- [ ] Implementar ConversationController
- [ ] Configurar ConversationModule
- [ ] Registrar no AppModule
- [ ] Rodar migration (drizzle-kit generate + migrate)
- [ ] Integrar com IIntentDetector (mock da Fase 5)
- [ ] Criar testes unitarios
- [ ] Criar testes de integracao
- [ ] Criar testes E2E

## Resultado Esperado

1. Agregado Conversation funcionando
2. Fluxo de recebimento de mensagens completo
3. Deteccao de intencao (mock)
4. Projections atualizadas via Drizzle
5. API REST para testes
6. Testes passando

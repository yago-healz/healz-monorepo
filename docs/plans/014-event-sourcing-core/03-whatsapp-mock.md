# Fase 3: WhatsApp Mock

## Objetivo

Criar um gateway simulado de WhatsApp que permita testar o fluxo de recebimento e envio de mensagens sem depender da integracao real com WhatsApp Business API.

## Pre-requisitos

- Fase 1 concluida (Event Store Foundation)

## Escopo

### O que sera implementado

1. **Interface IMessagingGateway** - Contrato para envio/recebimento de mensagens
2. **MockMessagingGateway** - Implementacao simulada
3. **Endpoint de teste** - POST /test/simulate-message para simular recebimento
4. **Logging** - Registro de mensagens enviadas (para validacao manual)

### O que NAO sera implementado

- Integracao real com WhatsApp (Fase 8)
- Processamento de mensagens (Fase 4 - Conversation Aggregate)
- UI para enviar mensagens de teste

## Estrutura de Arquivos

```
apps/api/src/
+-- messaging/
|   +-- messaging.module.ts
|   +-- domain/
|   |   +-- messaging-gateway.interface.ts
|   +-- infrastructure/
|   |   +-- mock-messaging-gateway.service.ts
|   +-- test/
|   |   +-- test-messaging.controller.ts
|   |   +-- dtos/
|   |       +-- simulate-message.dto.ts
```

## Interface IMessagingGateway

```typescript
// domain/messaging-gateway.interface.ts

export interface OutgoingMessage {
  to: string;           // Numero do destinatario (formato: +5511999999999)
  content: string;      // Conteudo da mensagem
  type?: "text" | "image" | "document";
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

export interface IncomingMessage {
  from: string;
  content: string;
  timestamp: Date;
  messageId: string;
  type?: "text" | "image" | "document";
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

export interface MessageDeliveryStatus {
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: Date;
  error?: string;
}

export interface IMessagingGateway {
  sendMessage(message: OutgoingMessage): Promise<MessageDeliveryStatus>;
  sendMessages(messages: OutgoingMessage[]): Promise<MessageDeliveryStatus[]>;
  getDeliveryStatus(messageId: string): Promise<MessageDeliveryStatus>;
  checkPhoneNumber(phone: string): Promise<boolean>;
}
```

## Mock Implementation

```typescript
// infrastructure/mock-messaging-gateway.service.ts

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  IMessagingGateway, OutgoingMessage, MessageDeliveryStatus,
} from "../domain/messaging-gateway.interface";

@Injectable()
export class MockMessagingGateway implements IMessagingGateway {
  private readonly logger = new Logger(MockMessagingGateway.name);
  private sentMessages: Map<string, MessageDeliveryStatus> = new Map();

  async sendMessage(message: OutgoingMessage): Promise<MessageDeliveryStatus> {
    const messageId = randomUUID();

    this.logger.log(`[MOCK] Sending message to ${message.to}: ${message.content.substring(0, 50)}...`);

    // Simula delay de rede
    await this.simulateDelay(100, 500);

    // Simula falha aleatoria (5%)
    const shouldFail = Math.random() < 0.05;

    const status: MessageDeliveryStatus = {
      messageId,
      status: shouldFail ? "failed" : "sent",
      timestamp: new Date(),
      error: shouldFail ? "Network timeout (simulated)" : undefined,
    };

    this.sentMessages.set(messageId, status);

    if (!shouldFail) {
      this.simulateStatusProgression(messageId);
    }

    return status;
  }

  async sendMessages(messages: OutgoingMessage[]): Promise<MessageDeliveryStatus[]> {
    const results: MessageDeliveryStatus[] = [];
    for (const message of messages) {
      const result = await this.sendMessage(message);
      results.push(result);
    }
    return results;
  }

  async getDeliveryStatus(messageId: string): Promise<MessageDeliveryStatus> {
    const status = this.sentMessages.get(messageId);
    if (!status) {
      throw new NotFoundException(`Message not found: ${messageId}`);
    }
    return status;
  }

  async checkPhoneNumber(phone: string): Promise<boolean> {
    this.logger.log(`[MOCK] Checking phone: ${phone} - Valid`);
    return true;
  }

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private simulateStatusProgression(messageId: string): void {
    setTimeout(() => {
      const status = this.sentMessages.get(messageId);
      if (status) {
        status.status = "delivered";
        status.timestamp = new Date();
      }
    }, 2000);

    setTimeout(() => {
      if (Math.random() < 0.7) {
        const status = this.sentMessages.get(messageId);
        if (status) {
          status.status = "read";
          status.timestamp = new Date();
        }
      }
    }, 5000);
  }

  // Helpers para testes
  clearHistory(): void {
    this.sentMessages.clear();
  }

  getHistory(): MessageDeliveryStatus[] {
    return Array.from(this.sentMessages.values());
  }
}
```

## Endpoint de Teste

### Controller

```typescript
// test/test-messaging.controller.ts

import { Controller, Post, Get, Delete, Body, Inject, BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { IMessagingGateway, IncomingMessage } from "../domain/messaging-gateway.interface";
import { MockMessagingGateway } from "../infrastructure/mock-messaging-gateway.service";
import { SimulateMessageDto, SendTestMessageDto } from "./dtos/simulate-message.dto";

@Controller("test/messaging")
export class TestMessagingController {
  constructor(
    @Inject("IMessagingGateway")
    private readonly messagingGateway: IMessagingGateway,
  ) {}

  @Post("simulate-message")
  async simulateIncomingMessage(@Body() dto: SimulateMessageDto) {
    const incomingMessage: IncomingMessage = {
      from: dto.from,
      content: dto.content,
      timestamp: new Date(),
      messageId: randomUUID(),
      type: dto.type || "text",
      metadata: dto.metadata,
    };

    // TODO: Quando Conversation Aggregate estiver pronto (Fase 4),
    // publicar evento MessageReceived via eventBus

    return {
      success: true,
      message: "Message simulated successfully",
      data: incomingMessage,
    };
  }

  @Post("send-test-message")
  async sendTestMessage(@Body() dto: SendTestMessageDto) {
    const result = await this.messagingGateway.sendMessage({
      to: dto.to,
      content: dto.content,
      type: dto.type,
    });

    return {
      success: true,
      delivery_status: result,
    };
  }

  @Get("history")
  async getHistory() {
    if (this.messagingGateway instanceof MockMessagingGateway) {
      return { messages: this.messagingGateway.getHistory() };
    }
    throw new BadRequestException("History only available in mock mode");
  }

  @Delete("history")
  async clearHistory() {
    if (this.messagingGateway instanceof MockMessagingGateway) {
      this.messagingGateway.clearHistory();
      return { success: true, message: "History cleared" };
    }
    throw new BadRequestException("Clear only available in mock mode");
  }
}
```

### DTOs

```typescript
// test/dtos/simulate-message.dto.ts

import { IsString, IsOptional, IsEnum, Matches, MinLength } from "class-validator";

export class SimulateMessageDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  from: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsEnum(["text", "image", "document"])
  type?: "text" | "image" | "document";

  @IsOptional()
  metadata?: Record<string, any>;
}

export class SendTestMessageDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  to: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsEnum(["text", "image", "document"])
  type?: "text" | "image" | "document";
}
```

## Module Configuration

```typescript
// messaging.module.ts

import { Module } from "@nestjs/common";
import { MockMessagingGateway } from "./infrastructure/mock-messaging-gateway.service";
import { TestMessagingController } from "./test/test-messaging.controller";

@Module({
  controllers: [TestMessagingController],
  providers: [
    {
      provide: "IMessagingGateway",
      useClass: MockMessagingGateway,
    },
  ],
  exports: ["IMessagingGateway"],
})
export class MessagingModule {}
```

**Nota:** Adicionar `MessagingModule` nos imports do `AppModule`.

## Variaveis de Ambiente

```bash
# .env
MESSAGING_MODE=mock   # 'mock' | 'whatsapp' (Fase 8 muda para whatsapp)
```

## Testes

### Testes Unitarios

```typescript
describe("MockMessagingGateway", () => {
  let gateway: MockMessagingGateway;

  beforeEach(() => {
    gateway = new MockMessagingGateway();
  });

  it("should send message successfully", async () => {
    const result = await gateway.sendMessage({
      to: "+5511999999999",
      content: "Hello, World!",
    });

    expect(result.messageId).toBeDefined();
    expect(["sent", "failed"]).toContain(result.status);
  });

  it("should get delivery status", async () => {
    const sent = await gateway.sendMessage({
      to: "+5511999999999",
      content: "Test",
    });

    const status = await gateway.getDeliveryStatus(sent.messageId);
    expect(status.messageId).toBe(sent.messageId);
  });

  it("should check phone number", async () => {
    const isValid = await gateway.checkPhoneNumber("+5511999999999");
    expect(isValid).toBe(true);
  });

  it("should clear history", () => {
    gateway.clearHistory();
    const history = gateway.getHistory();
    expect(history).toHaveLength(0);
  });
});
```

### Testes E2E

```typescript
describe("Test Messaging API (e2e)", () => {
  it("POST /test/messaging/simulate-message", async () => {
    const response = await request(app.getHttpServer())
      .post("/test/messaging/simulate-message")
      .send({
        from: "+5511999999999",
        content: "Ola, quero agendar consulta",
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.messageId).toBeDefined();
  });

  it("POST /test/messaging/send-test-message", async () => {
    const response = await request(app.getHttpServer())
      .post("/test/messaging/send-test-message")
      .send({
        to: "+5511999999999",
        content: "Consulta agendada!",
      })
      .expect(201);

    expect(response.body.delivery_status.status).toBeDefined();
  });

  it("GET /test/messaging/history", async () => {
    await request(app.getHttpServer())
      .post("/test/messaging/send-test-message")
      .send({ to: "+5511999999999", content: "Test" });

    const response = await request(app.getHttpServer())
      .get("/test/messaging/history")
      .expect(200);

    expect(response.body.messages.length).toBeGreaterThan(0);
  });
});
```

## Checklist de Implementacao

- [ ] Criar interface IMessagingGateway
- [ ] Implementar MockMessagingGateway
- [ ] Criar DTOs de validacao
- [ ] Implementar TestMessagingController
- [ ] Configurar MessagingModule
- [ ] Registrar MessagingModule no AppModule
- [ ] Criar testes unitarios do mock
- [ ] Criar testes E2E dos endpoints
- [ ] Validar manualmente via curl

## Resultado Esperado

1. Interface IMessagingGateway definida
2. MockMessagingGateway funcionando
3. Endpoint para simular mensagens recebidas
4. Endpoint para testar envio de mensagens
5. Testes passando
6. Infraestrutura pronta para substituir por WhatsApp real (Fase 8)

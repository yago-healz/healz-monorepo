# Fase 8: WhatsApp Integration

## Objetivo

Integrar o sistema com a WhatsApp Business API real, substituindo o gateway mock por uma implementacao que recebe e envia mensagens atraves do WhatsApp.

## Pre-requisitos

- Fase 1 concluida (Event Store Foundation)
- Fase 3 concluida (WhatsApp Mock) - sera substituido
- Fase 4 concluida (Conversation Aggregate)

## Escopo

### O que sera implementado

1. **WhatsApp Business API Client** - Cliente para interagir com API oficial
2. **Webhook Receiver** - Endpoint para receber mensagens do WhatsApp
3. **Message Sender** - Servico para enviar mensagens
4. **Message Templates** - Suporte a templates pre-aprovados
5. **Media Handler** - Upload/download de imagens, documentos, etc.
6. **Webhook Verification** - Seguranca do webhook

### O que NAO sera implementado

- WhatsApp Cloud API (usar Business API on-premise ou parceiro como Twilio)
- Rich media cards/carousels (apenas texto, imagem, documento)
- WhatsApp Payments
- Catalogo de produtos
- Botoes interativos (futura iteracao)

## Arquitetura

```
+---------------+
|   WhatsApp    |
|    Server     |
+-------+-------+
        |
        | webhook
        v
+-------------------------------+
|   Healz API                   |
|                               |
|  +-------------------------+  |
|  |  Webhook Controller     |  |
|  |  POST /webhooks/wa      |  |
|  +------------+------------+  |
|               |                |
|               v                |
|  +-------------------------+  |
|  |  WhatsApp Gateway       |  |
|  |  - Verify signature     |  |
|  |  - Parse payload        |  |
|  |  - Emit event           |  |
|  +------------+------------+  |
|               |                |
|               v                |
|  +-------------------------+  |
|  |  Event Bus (RabbitMQ)   |  |
|  |  MessageReceived        |  |
|  +-------------------------+  |
+-------------------------------+
```

## Estrutura de Arquivos

```
apps/api/src/
+-- messaging/
|   +-- messaging.module.ts            # Atualizar - trocar mock por real
|   +-- domain/
|   |   +-- messaging-gateway.interface.ts   # Ja existe (Fase 3)
|   +-- infrastructure/
|   |   +-- mock-messaging-gateway.service.ts  # Ja existe (Fase 3)
|   |   +-- whatsapp-gateway.service.ts        # NOVO
|   |   +-- whatsapp-config.ts                 # NOVO
|   |   +-- whatsapp-templates.ts              # NOVO
|   +-- api/
|   |   +-- whatsapp-webhook.controller.ts     # NOVO
|   |   +-- whatsapp-webhook.service.ts        # NOVO
|   +-- test/
|       +-- test-messaging.controller.ts       # Ja existe (Fase 3)
```

## Configuracao

```typescript
// infrastructure/whatsapp-config.ts

export interface WhatsAppConfig {
  provider: "twilio" | "official" | "360dialog";
  twilio: {
    accountSid: string;
    authToken: string;
    whatsappNumber: string;
  };
  webhook: {
    path: string;
    verifyToken: string;
  };
  rateLimits: {
    messagesPerSecond: number;
    messagesPerDay: number;
  };
}

export function createWhatsAppConfig(): WhatsAppConfig {
  return {
    provider: (process.env.WHATSAPP_PROVIDER as any) || "twilio",
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || "",
      authToken: process.env.TWILIO_AUTH_TOKEN || "",
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || "",
    },
    webhook: {
      path: "/api/v1/webhooks/whatsapp",
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    },
    rateLimits: {
      messagesPerSecond: parseInt(process.env.WHATSAPP_RATE_LIMIT_PER_SECOND || "10"),
      messagesPerDay: parseInt(process.env.WHATSAPP_RATE_LIMIT_PER_DAY || "1000"),
    },
  };
}
```

## WhatsApp Gateway

Implementa a interface `IMessagingGateway` definida na Fase 3.

```typescript
// infrastructure/whatsapp-gateway.service.ts

import { Injectable, Logger } from "@nestjs/common";
import { Twilio } from "twilio";
import {
  IMessagingGateway, OutgoingMessage, MessageDeliveryStatus,
} from "../domain/messaging-gateway.interface";
import { WhatsAppConfig } from "./whatsapp-config";

@Injectable()
export class WhatsAppGateway implements IMessagingGateway {
  private readonly logger = new Logger(WhatsAppGateway.name);
  private readonly client: Twilio;
  private readonly fromNumber: string;

  constructor(private readonly config: WhatsAppConfig) {
    this.client = new Twilio(
      config.twilio.accountSid,
      config.twilio.authToken,
    );
    this.fromNumber = config.twilio.whatsappNumber;
  }

  async sendMessage(message: OutgoingMessage): Promise<MessageDeliveryStatus> {
    try {
      const to = this.formatPhoneNumber(message.to);

      const result = await this.client.messages.create({
        from: this.fromNumber,
        to: `whatsapp:${to}`,
        body: message.content,
        mediaUrl: message.mediaUrl ? [message.mediaUrl] : undefined,
      });

      this.logger.log(`Message sent to ${to}: ${result.sid}`);

      return {
        messageId: result.sid,
        status: "sent",
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`, error.stack);
      return {
        messageId: "",
        status: "failed",
        timestamp: new Date(),
        error: error.message,
      };
    }
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
    try {
      const message = await this.client.messages(messageId).fetch();
      return {
        messageId: message.sid,
        status: this.mapTwilioStatus(message.status),
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get status: ${error.message}`);
      throw error;
    }
  }

  async checkPhoneNumber(phone: string): Promise<boolean> {
    try {
      const formatted = this.formatPhoneNumber(phone);
      // Twilio lookup para verificar se numero e valido
      await this.client.lookups.v2.phoneNumbers(formatted).fetch();
      return true;
    } catch {
      return false;
    }
  }

  // Template support

  async sendTemplate(
    to: string,
    templateName: string,
    params: Record<string, string>,
  ): Promise<MessageDeliveryStatus> {
    const body = this.renderTemplate(templateName, params);
    return this.sendMessage({ to, content: body });
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    const response = await fetch(mediaUrl);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  }

  // Helpers

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, "");
    if (!cleaned.startsWith("55")) {
      cleaned = "55" + cleaned;
    }
    return "+" + cleaned;
  }

  private mapTwilioStatus(status: string): "sent" | "delivered" | "read" | "failed" {
    switch (status) {
      case "delivered": return "delivered";
      case "read": return "read";
      case "failed":
      case "undelivered": return "failed";
      default: return "sent";
    }
  }

  private renderTemplate(templateName: string, params: Record<string, string>): string {
    const templates: Record<string, string> = {
      appointment_reminder: "Ola! Lembrando da sua consulta amanha as {{time}}. Confirme sua presenca respondendo SIM.",
      appointment_confirmed: "Consulta confirmada para {{date}} as {{time}}. Te esperamos!",
      appointment_cancelled: "Sua consulta do dia {{date}} foi cancelada. Entre em contato para reagendar.",
      welcome: "Ola {{name}}! Bem-vindo(a) a {{clinic}}. Como podemos ajudar?",
    };

    let template = templates[templateName];
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    for (const [key, value] of Object.entries(params)) {
      template = template.replace(`{{${key}}}`, value);
    }

    return template;
  }
}
```

## Webhook Controller

```typescript
// api/whatsapp-webhook.controller.ts

import {
  Controller, Get, Post, Query, Body,
  HttpCode, Logger, UnauthorizedException, Inject,
} from "@nestjs/common";
import { WhatsAppWebhookService } from "./whatsapp-webhook.service";
import { WhatsAppConfig } from "../infrastructure/whatsapp-config";

@Controller("webhooks/whatsapp")
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly webhookService: WhatsAppWebhookService,
    @Inject("WHATSAPP_CONFIG") private readonly config: WhatsAppConfig,
  ) {}

  // Webhook verification (GET) - WhatsApp envia verificacao inicial
  @Get()
  async verifyWebhook(@Query() query: any): Promise<any> {
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    if (mode === "subscribe" && token === this.config.webhook.verifyToken) {
      this.logger.log("Webhook verified successfully");
      return challenge;
    }

    throw new UnauthorizedException("Invalid verification token");
  }

  // Receber mensagens (POST)
  @Post()
  @HttpCode(200)
  async receiveMessage(@Body() payload: any): Promise<void> {
    try {
      const incomingMessage = this.parseTwilioPayload(payload);
      await this.webhookService.handleIncomingMessage(incomingMessage);
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`, error.stack);
      // Sempre retornar 200 para nao receber retries
    }
  }

  // Status updates (delivery, read receipts)
  @Post("status")
  @HttpCode(200)
  async receiveStatus(@Body() payload: any): Promise<void> {
    try {
      const status = {
        messageId: payload.MessageSid,
        status: payload.MessageStatus,
        timestamp: new Date(),
      };
      await this.webhookService.handleStatusUpdate(status);
    } catch (error) {
      this.logger.error(`Status update error: ${error.message}`);
    }
  }

  private parseTwilioPayload(payload: any) {
    return {
      from: payload.From?.replace("whatsapp:", "") || "",
      to: payload.To?.replace("whatsapp:", "") || "",
      body: payload.Body || "",
      messageId: payload.MessageSid || "",
      timestamp: new Date(),
      mediaUrl: payload.MediaUrl0,
      mediaType: payload.MediaContentType0,
    };
  }
}
```

## Webhook Service

```typescript
// api/whatsapp-webhook.service.ts

import { Injectable, Inject, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../../../db";
import { patientView } from "../../../db/schema/patient-view.schema";
import { conversationView } from "../../../db/schema/conversation-view.schema";
import { IEventStore } from "../../../event-sourcing/event-store/event-store.interface";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    @Inject("IEventStore") private readonly eventStore: IEventStore,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
  ) {}

  async handleIncomingMessage(message: {
    from: string;
    body: string;
    messageId: string;
    mediaUrl?: string;
    mediaType?: string;
  }): Promise<void> {
    try {
      // 1. Buscar patient pelo numero de telefone
      const patient = await this.findPatientByPhone(message.from);

      if (!patient) {
        this.logger.warn(`No patient found for phone: ${message.from}`);
        // TODO: auto-register patient ou ignorar
        return;
      }

      // 2. Buscar conversation ativa
      const conversation = await this.findActiveConversation(patient.id);

      if (!conversation) {
        this.logger.warn(`No active conversation for patient: ${patient.id}`);
        // TODO: auto-start conversation
        return;
      }

      // 3. Processar como MessageReceived no Conversation Aggregate
      // Delegar para ConversationService (Fase 4)
      this.logger.log(`Message processed: ${message.messageId} from ${message.from}`);
    } catch (error) {
      this.logger.error(`Failed to handle incoming message: ${error.message}`, error.stack);
      throw error;
    }
  }

  async handleStatusUpdate(status: {
    messageId: string;
    status: string;
    timestamp: Date;
  }): Promise<void> {
    this.logger.log(`Status update: ${status.messageId} -> ${status.status}`);
  }

  private async findPatientByPhone(phone: string): Promise<{ id: string } | null> {
    const [result] = await db.select({ id: patientView.id })
      .from(patientView)
      .where(eq(patientView.phone, phone));

    return result || null;
  }

  private async findActiveConversation(patientId: string): Promise<{ id: string } | null> {
    const [result] = await db.select({ id: conversationView.id })
      .from(conversationView)
      .where(
        and(
          eq(conversationView.patientId, patientId),
          eq(conversationView.status, "active"),
        ),
      );

    return result || null;
  }
}
```

## Module Configuration

```typescript
// messaging.module.ts (ATUALIZADO)

import { Module } from "@nestjs/common";
import { MockMessagingGateway } from "./infrastructure/mock-messaging-gateway.service";
import { WhatsAppGateway } from "./infrastructure/whatsapp-gateway.service";
import { createWhatsAppConfig } from "./infrastructure/whatsapp-config";
import { TestMessagingController } from "./test/test-messaging.controller";
import { WhatsAppWebhookController } from "./api/whatsapp-webhook.controller";
import { WhatsAppWebhookService } from "./api/whatsapp-webhook.service";

const config = createWhatsAppConfig();
const isMock = process.env.MESSAGING_MODE !== "whatsapp";

@Module({
  controllers: [
    WhatsAppWebhookController,
    ...(isMock ? [TestMessagingController] : []),
  ],
  providers: [
    {
      provide: "WHATSAPP_CONFIG",
      useValue: config,
    },
    {
      provide: "IMessagingGateway",
      useClass: isMock ? MockMessagingGateway : WhatsAppGateway,
    },
    WhatsAppWebhookService,
  ],
  exports: ["IMessagingGateway"],
})
export class MessagingModule {}
```

**Nota:** `MESSAGING_MODE=mock` usa MockMessagingGateway, `MESSAGING_MODE=whatsapp` usa WhatsAppGateway.

## Message Templates

```typescript
// infrastructure/whatsapp-templates.ts

export const WHATSAPP_TEMPLATES = {
  welcome: {
    name: "welcome",
    category: "UTILITY",
    language: "pt_BR",
    body: "Ola {{1}}! Bem-vindo(a) a {{2}}. Como podemos ajudar voce hoje?",
  },
  appointment_reminder: {
    name: "appointment_reminder",
    category: "UTILITY",
    language: "pt_BR",
    body: "Ola {{1}}! Lembrando da sua consulta amanha, dia {{2}} as {{3}}. Por favor, confirme sua presenca respondendo SIM.",
  },
  appointment_confirmed: {
    name: "appointment_confirmed",
    category: "UTILITY",
    language: "pt_BR",
    body: "Consulta confirmada para {{1}} as {{2}}. Endereco: {{3}}. Te esperamos!",
  },
};
```

## Variaveis de Ambiente

```bash
# .env

# WhatsApp / Twilio
MESSAGING_MODE=mock          # 'mock' | 'whatsapp'
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Webhook
WHATSAPP_VERIFY_TOKEN=seu_token_secreto_aqui
WHATSAPP_WEBHOOK_URL=https://sua-api.com/api/v1/webhooks/whatsapp

# Rate Limits
WHATSAPP_RATE_LIMIT_PER_SECOND=10
WHATSAPP_RATE_LIMIT_PER_DAY=1000
```

## Testes

### Testes do Gateway

```typescript
describe("WhatsAppGateway", () => {
  // Testes com Twilio mockado
  let gateway: WhatsAppGateway;
  let mockTwilioClient: any;

  beforeEach(() => {
    // Mock Twilio client
    const config = createWhatsAppConfig();
    gateway = new WhatsAppGateway(config);
  });

  it("should format phone number correctly", () => {
    const formatted = gateway["formatPhoneNumber"]("11999999999");
    expect(formatted).toBe("+5511999999999");
  });

  it("should render template with params", () => {
    const message = gateway["renderTemplate"]("appointment_reminder", {
      time: "14h",
    });
    expect(message).toContain("14h");
  });

  it("should throw for unknown template", () => {
    expect(() => {
      gateway["renderTemplate"]("unknown_template", {});
    }).toThrow("Template not found");
  });
});
```

### Testes do Webhook

```typescript
describe("WhatsAppWebhookController (E2E)", () => {
  it("GET /webhooks/whatsapp - should verify webhook", async () => {
    const response = await request(app.getHttpServer())
      .get("/webhooks/whatsapp")
      .query({
        "hub.mode": "subscribe",
        "hub.verify_token": "test_token",
        "hub.challenge": "12345",
      })
      .expect(200);

    expect(response.text).toBe("12345");
  });

  it("POST /webhooks/whatsapp - should receive message", async () => {
    const payload = {
      From: "whatsapp:+5511999999999",
      To: "whatsapp:+14155238886",
      Body: "Ola",
      MessageSid: "SM123456",
    };

    await request(app.getHttpServer())
      .post("/webhooks/whatsapp")
      .send(payload)
      .expect(200);
  });

  it("should handle message with media", async () => {
    const payload = {
      From: "whatsapp:+5511999999999",
      To: "whatsapp:+14155238886",
      Body: "",
      MessageSid: "SM123456",
      MediaUrl0: "https://example.com/image.jpg",
      MediaContentType0: "image/jpeg",
    };

    await request(app.getHttpServer())
      .post("/webhooks/whatsapp")
      .send(payload)
      .expect(200);
  });
});
```

## Configuracao do Webhook no Twilio

1. Acesse o console Twilio: https://console.twilio.com
2. Va em Messaging > Settings > WhatsApp Sandbox Settings
3. Configure:
   - **When a message comes in:** `https://sua-api.com/api/v1/webhooks/whatsapp`
   - **Method:** POST
   - **Status callback URL:** `https://sua-api.com/api/v1/webhooks/whatsapp/status`

## Security Checklist

- [ ] Validar assinatura Twilio em todas as requisicoes
- [ ] Rate limiting no webhook
- [ ] Verificar token de webhook (hub.verify_token)
- [ ] Sanitizar inputs de mensagens
- [ ] Nao expor credenciais em logs
- [ ] HTTPS obrigatorio (webhook)
- [ ] Implementar retry logic com exponential backoff
- [ ] Monitorar falhas de envio

## Checklist de Implementacao

- [ ] Configurar conta Twilio WhatsApp
- [ ] Criar WhatsAppConfig
- [ ] Implementar WhatsAppGateway (implementa IMessagingGateway)
- [ ] Criar WhatsAppWebhookController
- [ ] Criar WhatsAppWebhookService (com queries Drizzle)
- [ ] Implementar message templates
- [ ] Atualizar MessagingModule (trocar mock por real via env)
- [ ] Criar testes unitarios
- [ ] Criar testes E2E do webhook
- [ ] Testar envio e recebimento end-to-end
- [ ] Validar rate limiting
- [ ] Documentar setup para producao

## Resultado Esperado

1. Integracao com WhatsApp Business API funcionando
2. Recebimento de mensagens via webhook
3. Envio de mensagens e templates
4. Download de media (imagens, documentos)
5. Webhook seguro com validacao de assinatura
6. Todos os testes passando
7. Mock substituido por implementacao real (via env var)

**Validacao:**
1. Enviar mensagem do WhatsApp -> webhook recebe -> cria/atualiza conversation
2. Sistema envia mensagem -> chega no WhatsApp do paciente
3. Enviar imagem do WhatsApp -> sistema baixa e armazena
4. Usar template -> mensagem formatada corretamente
5. Rate limit -> nao excede limites da API

## Troubleshooting

### Webhook nao recebe mensagens
- Verificar se URL e HTTPS
- Verificar se porta esta acessivel (nao usar localhost)
- Usar ngrok para testes locais: `ngrok http 3001`
- Verificar logs do Twilio

### Mensagens nao sao enviadas
- Verificar credenciais Twilio
- Verificar formato do numero (+55...)
- Verificar se numero esta na sandbox (modo teste)
- Verificar rate limits

### Template rejeitado
- Templates precisam ser pre-aprovados pelo WhatsApp
- Usar templates genericos em dev
- Seguir guidelines do WhatsApp

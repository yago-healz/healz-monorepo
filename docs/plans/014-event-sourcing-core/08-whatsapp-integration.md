# Fase 8: WhatsApp Integration

## Objetivo

Integrar o sistema com a WhatsApp Business API real, substituindo o gateway mock por uma implementação que recebe e envia mensagens através do WhatsApp.

## Pré-requisitos

- ✅ Fase 1 concluída (Event Store Foundation)
- ✅ Fase 3 concluída (WhatsApp Mock) - será substituído
- ✅ Fase 4 concluída (Conversation Aggregate)

## Escopo

### O que será implementado

1. **WhatsApp Business API Client** - Cliente para interagir com API oficial
2. **Webhook Receiver** - Endpoint para receber mensagens do WhatsApp
3. **Message Sender** - Serviço para enviar mensagens
4. **Message Templates** - Suporte a templates pré-aprovados
5. **Media Handler** - Upload/download de imagens, documentos, etc.
6. **Webhook Verification** - Segurança do webhook

### O que NÃO será implementado

- ❌ WhatsApp Cloud API (usar Business API on-premise ou parceiro como Twilio)
- ❌ Rich media cards/carousels (apenas texto, imagem, documento)
- ❌ WhatsApp Payments
- ❌ Catálogo de produtos
- ❌ Botões interativos (futura iteração)

## Arquitetura

```
┌─────────────┐
│  WhatsApp   │
│   Server    │
└──────┬──────┘
       │
       │ webhook
       ▼
┌──────────────────────────────┐
│   Healz API                  │
│                              │
│  ┌────────────────────────┐  │
│  │  Webhook Controller    │  │
│  │  POST /webhooks/wa     │  │
│  └───────────┬────────────┘  │
│              │               │
│              ▼               │
│  ┌────────────────────────┐  │
│  │  WhatsApp Gateway      │  │
│  │  - Verify signature    │  │
│  │  - Parse payload       │  │
│  │  - Emit event          │  │
│  └───────────┬────────────┘  │
│              │               │
│              ▼               │
│  ┌────────────────────────┐  │
│  │  Event Bus (RabbitMQ)  │  │
│  │  MessageReceived       │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

## WhatsApp Business API Setup

### Opções de Integração

1. **WhatsApp Business API (oficial)** - Requer hosting próprio
2. **Twilio WhatsApp API** - Mais simples, managed service (recomendado para MVP)
3. **360dialog** - Parceiro oficial europeu
4. **MessageBird** - Alternativa global

**Recomendação para MVP:** Twilio (mais fácil de configurar, pricing transparente)

### Configuração Twilio

```typescript
// config/whatsapp.config.ts

export const whatsappConfig = {
  provider: process.env.WHATSAPP_PROVIDER || 'twilio', // 'twilio' | 'official' | '360dialog'

  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER, // whatsapp:+14155238886
  },

  // Webhook
  webhook: {
    path: '/api/v1/webhooks/whatsapp',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  },

  // Rate limiting
  rateLimits: {
    messagesPerSecond: 10,
    messagesPerDay: 1000,
  },
};
```

## WhatsApp Gateway Implementation

```typescript
// infrastructure/messaging/whatsapp/whatsapp.gateway.ts

import { Twilio } from 'twilio';

export interface SendMessageOptions {
  to: string; // Phone number in E.164 format
  body: string;
  mediaUrl?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

export interface IncomingMessage {
  from: string;
  to: string;
  body: string;
  messageId: string;
  timestamp: Date;
  mediaUrl?: string;
  mediaType?: string;
}

@Injectable()
export class WhatsAppGateway implements IMessagingGateway {
  private readonly logger = new Logger(WhatsAppGateway.name);
  private readonly client: Twilio;
  private readonly fromNumber: string;

  constructor(
    private readonly eventBus: EventBus,
    @Inject('WHATSAPP_CONFIG') private readonly config: any,
  ) {
    this.client = new Twilio(
      config.twilio.accountSid,
      config.twilio.authToken,
    );
    this.fromNumber = config.twilio.whatsappNumber;
  }

  async sendMessage(options: SendMessageOptions): Promise<string> {
    try {
      // Validar número
      const to = this.formatPhoneNumber(options.to);

      // Enviar via Twilio
      const message = await this.client.messages.create({
        from: this.fromNumber,
        to: `whatsapp:${to}`,
        body: options.body,
        mediaUrl: options.mediaUrl ? [options.mediaUrl] : undefined,
      });

      this.logger.log(`Message sent to ${to}: ${message.sid}`);

      return message.sid;
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`, error.stack);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    params: Record<string, string>,
  ): Promise<string> {
    try {
      // Templates pré-aprovados pelo WhatsApp
      const body = this.renderTemplate(templateName, params);

      return this.sendMessage({ to, body });
    } catch (error) {
      this.logger.error(`Failed to send template: ${error.message}`);
      throw error;
    }
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(mediaUrl);
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      this.logger.error(`Failed to download media: ${error.message}`);
      throw error;
    }
  }

  // Helpers

  private formatPhoneNumber(phone: string): string {
    // Remove caracteres não-numéricos
    let cleaned = phone.replace(/\D/g, '');

    // Adicionar código do país se não tiver
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }

    return '+' + cleaned;
  }

  private renderTemplate(templateName: string, params: Record<string, string>): string {
    const templates: Record<string, string> = {
      appointment_reminder: `Olá! Lembrando da sua consulta amanhã às {{time}}. Confirme sua presença respondendo SIM.`,
      appointment_confirmed: `✅ Consulta confirmada para {{date}} às {{time}}. Te esperamos!`,
      appointment_cancelled: `Sua consulta do dia {{date}} foi cancelada. Entre em contato para reagendar.`,
      welcome: `Olá {{name}}! Bem-vindo(a) à {{clinic}}. Como podemos ajudar?`,
    };

    let template = templates[templateName];

    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Substituir placeholders
    for (const [key, value] of Object.entries(params)) {
      template = template.replace(`{{${key}}}`, value);
    }

    return template;
  }
}
```

## Webhook Controller

```typescript
// presentation/controllers/whatsapp-webhook.controller.ts

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly whatsappService: WhatsAppWebhookService,
    @Inject('WHATSAPP_CONFIG') private readonly config: any,
  ) {}

  /**
   * Webhook verification (GET)
   * WhatsApp envia verificação inicial
   */
  @Get()
  async verifyWebhook(@Query() query: any): Promise<any> {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === this.config.webhook.verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    throw new UnauthorizedException('Invalid verification token');
  }

  /**
   * Receber mensagens (POST)
   */
  @Post()
  @HttpCode(200)
  async receiveMessage(@Body() payload: any): Promise<void> {
    try {
      // Validar signature (segurança)
      // this.validateSignature(req.headers['x-twilio-signature'], req.body);

      // Parse do payload Twilio
      const incomingMessage = this.parseIncomingMessage(payload);

      // Processar mensagem
      await this.whatsappService.handleIncomingMessage(incomingMessage);

      // Sempre retornar 200 imediatamente
      // (processamento assíncrono via event bus)
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`, error.stack);
      // Ainda assim retornar 200 para não ficar recebendo retries
    }
  }

  /**
   * Status updates (delivery, read receipts, etc.)
   */
  @Post('status')
  @HttpCode(200)
  async receiveStatus(@Body() payload: any): Promise<void> {
    try {
      const status = this.parseStatusUpdate(payload);
      await this.whatsappService.handleStatusUpdate(status);
    } catch (error) {
      this.logger.error(`Status update error: ${error.message}`);
    }
  }

  private parseIncomingMessage(payload: any): IncomingMessage {
    // Formato Twilio
    return {
      from: payload.From.replace('whatsapp:', ''),
      to: payload.To.replace('whatsapp:', ''),
      body: payload.Body || '',
      messageId: payload.MessageSid,
      timestamp: new Date(),
      mediaUrl: payload.MediaUrl0,
      mediaType: payload.MediaContentType0,
    };
  }

  private parseStatusUpdate(payload: any): any {
    return {
      messageId: payload.MessageSid,
      status: payload.MessageStatus, // sent, delivered, read, failed
      timestamp: new Date(),
    };
  }

  private validateSignature(signature: string, body: any): void {
    // Implementar validação de assinatura Twilio
    // https://www.twilio.com/docs/usage/webhooks/webhooks-security
  }
}
```

## WhatsApp Service

```typescript
// application/services/whatsapp.service.ts

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly patientRepository: PatientRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    try {
      // 1. Buscar ou criar patient pelo número de telefone
      const patient = await this.findOrCreatePatient(message.from);

      // 2. Buscar ou criar conversation
      const conversation = await this.findOrCreateConversation(patient.id);

      // 3. Registrar mensagem recebida
      await this.conversationService.receiveMessage(
        conversation.id,
        patient.id,
        message.body,
        {
          messageId: message.messageId,
          channel: 'whatsapp',
          mediaUrl: message.mediaUrl,
          mediaType: message.mediaType,
        },
      );

      this.logger.log(`Message processed: ${message.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to handle incoming message: ${error.message}`, error.stack);
      throw error;
    }
  }

  async handleStatusUpdate(status: any): Promise<void> {
    // Atualizar status da mensagem (delivered, read, etc.)
    this.logger.log(`Status update: ${status.messageId} -> ${status.status}`);

    // Pode emitir evento se necessário
    // await this.eventBus.publish(new MessageStatusUpdatedEvent(...));
  }

  private async findOrCreatePatient(phoneNumber: string): Promise<any> {
    // Buscar patient por telefone
    const result = await this.patientRepository.findByPhone(phoneNumber);

    if (result) return result;

    // Se não existe, criar automaticamente
    this.logger.log(`Creating new patient for phone: ${phoneNumber}`);

    const patientId = randomUUID();
    const patient = Patient.register(
      patientId,
      'clinic-id', // TODO: identificar clínica pelo número WhatsApp
      undefined, // firstName
      undefined, // lastName
      phoneNumber,
      undefined, // email
      randomUUID(), // correlationId
    );

    await this.patientRepository.save(patient);

    return { id: patientId, phoneNumber };
  }

  private async findOrCreateConversation(patientId: string): Promise<any> {
    // Buscar conversation ativa
    // Se não existe, criar nova
    // Retornar { id, patientId }
  }
}
```

## Message Templates

```typescript
// domain/templates/whatsapp-templates.ts

export const WHATSAPP_TEMPLATES = {
  // Template de boas-vindas (pré-aprovado)
  welcome: {
    name: 'welcome',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'BODY',
        text: 'Olá {{1}}! Bem-vindo(a) à {{2}}. Como podemos ajudar você hoje?',
      },
    ],
  },

  // Template de lembrete de consulta
  appointment_reminder: {
    name: 'appointment_reminder',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'BODY',
        text: 'Olá {{1}}! Lembrando da sua consulta amanhã, dia {{2}} às {{3}}. Por favor, confirme sua presença respondendo SIM.',
      },
    ],
  },

  // Template de confirmação
  appointment_confirmed: {
    name: 'appointment_confirmed',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'BODY',
        text: '✅ Consulta confirmada para {{1}} às {{2}}. Endereço: {{3}}. Te esperamos!',
      },
    ],
  },
};
```

## Environment Variables

```bash
# .env

# WhatsApp / Twilio
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
describe('WhatsAppGateway', () => {
  it('should send text message', async () => {
    const gateway = new WhatsAppGateway(eventBus, config);

    const messageId = await gateway.sendMessage({
      to: '+5511999999999',
      body: 'Hello, World!',
    });

    expect(messageId).toBeDefined();
  });

  it('should format phone number correctly', async () => {
    const gateway = new WhatsAppGateway(eventBus, config);

    const formatted = gateway['formatPhoneNumber']('11999999999');
    expect(formatted).toBe('+5511999999999');
  });

  it('should render template with params', async () => {
    const gateway = new WhatsAppGateway(eventBus, config);

    const message = gateway['renderTemplate']('appointment_reminder', {
      time: '14h',
    });

    expect(message).toContain('14h');
  });
});
```

### Testes do Webhook

```typescript
describe('WhatsAppWebhookController (E2E)', () => {
  it('GET /webhooks/whatsapp - should verify webhook', async () => {
    const response = await request(app.getHttpServer())
      .get('/webhooks/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test_token',
        'hub.challenge': '12345',
      })
      .expect(200);

    expect(response.text).toBe('12345');
  });

  it('POST /webhooks/whatsapp - should receive message', async () => {
    const payload = {
      From: 'whatsapp:+5511999999999',
      To: 'whatsapp:+14155238886',
      Body: 'Olá',
      MessageSid: 'SM123456',
    };

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send(payload)
      .expect(200);

    // Verificar que evento foi emitido
    // Verificar que conversation foi criada
  });

  it('should handle message with media', async () => {
    const payload = {
      From: 'whatsapp:+5511999999999',
      To: 'whatsapp:+14155238886',
      Body: '',
      MessageSid: 'SM123456',
      MediaUrl0: 'https://example.com/image.jpg',
      MediaContentType0: 'image/jpeg',
    };

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send(payload)
      .expect(200);
  });
});
```

## Configuração do Webhook no Twilio

1. Acesse o console Twilio: https://console.twilio.com
2. Vá em Messaging > Settings > WhatsApp Sandbox Settings
3. Configure:
   - **When a message comes in:** `https://sua-api.com/api/v1/webhooks/whatsapp`
   - **Method:** POST
   - **Status callback URL:** `https://sua-api.com/api/v1/webhooks/whatsapp/status`

## Security Checklist

- [ ] Validar assinatura Twilio em todas as requisições
- [ ] Rate limiting no webhook
- [ ] Verificar token de webhook (hub.verify_token)
- [ ] Sanitizar inputs de mensagens
- [ ] Não expor credenciais em logs
- [ ] HTTPS obrigatório (webhook)
- [ ] Implementar retry logic com exponential backoff
- [ ] Monitorar falhas de envio

## Checklist de Implementação

- [ ] Configurar conta Twilio WhatsApp
- [ ] Implementar WhatsAppGateway (substituir mock)
- [ ] Criar WhatsAppWebhookController
- [ ] Criar WhatsAppWebhookService
- [ ] Implementar message templates
- [ ] Configurar webhook no Twilio
- [ ] Implementar download de media
- [ ] Criar testes unitários
- [ ] Criar testes E2E do webhook
- [ ] Testar envio e recebimento end-to-end
- [ ] Validar rate limiting
- [ ] Documentar setup para produção

## Resultado Esperado

Ao final desta fase, você deve ter:

1. ✅ Integração com WhatsApp Business API funcionando
2. ✅ Recebimento de mensagens via webhook
3. ✅ Envio de mensagens e templates
4. ✅ Download de media (imagens, documentos)
5. ✅ Webhook seguro com validação de assinatura
6. ✅ Todos os testes passando
7. ✅ Mock substituído por implementação real

**Validação:**
1. Enviar mensagem do WhatsApp → webhook recebe → cria/atualiza conversation
2. Sistema envia mensagem → chega no WhatsApp do paciente
3. Enviar imagem do WhatsApp → sistema baixa e armazena
4. Usar template → mensagem formatada corretamente
5. Rate limit → não excede limites da API

## Troubleshooting

### Webhook não recebe mensagens
- Verificar se URL é HTTPS
- Verificar se porta está acessível (não usar localhost)
- Usar ngrok para testes locais: `ngrok http 3001`
- Verificar logs do Twilio

### Mensagens não são enviadas
- Verificar credenciais Twilio
- Verificar formato do número (+55...)
- Verificar se número está na sandbox (modo teste)
- Verificar rate limits

### Template rejeitado
- Templates precisam ser pré-aprovados pelo WhatsApp
- Usar templates genéricos em dev
- Seguir guidelines do WhatsApp

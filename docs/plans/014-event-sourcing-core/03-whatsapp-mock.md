# Fase 3: WhatsApp Mock

## Objetivo

Criar um gateway simulado de WhatsApp que permita testar o fluxo de recebimento e envio de mensagens sem depender da integração real com WhatsApp Business API.

## Pré-requisitos

- ✅ Fase 1 concluída (Event Store Foundation)

## Escopo

### O que será implementado

1. **Interface IMessagingGateway** - Contrato para envio/recebimento de mensagens
2. **MockMessagingGateway** - Implementação simulada
3. **Endpoint de teste** - POST /test/simulate-message para simular recebimento
4. **Logging** - Registro de mensagens enviadas (para validação manual)

### O que NÃO será implementado

- ❌ Integração real com WhatsApp (Fase 8)
- ❌ Processamento de mensagens (Fase 4 - Conversation Aggregate)
- ❌ UI para enviar mensagens de teste

## Estrutura de Arquivos

```
apps/api/src/modules/
├── messaging/
│   ├── messaging.module.ts
│   ├── domain/
│   │   └── messaging-gateway.interface.ts
│   ├── infrastructure/
│   │   ├── mock-messaging-gateway.service.ts
│   │   └── test/
│   │       ├── test-messaging.controller.ts
│   │       └── dtos/
│   │           └── simulate-message.dto.ts
│   └── messaging.service.ts
```

## Interface IMessagingGateway

```typescript
// domain/messaging-gateway.interface.ts

export interface OutgoingMessage {
  to: string;           // Número do destinatário (formato: +5511999999999)
  content: string;      // Conteúdo da mensagem
  type?: 'text' | 'image' | 'document'; // Tipo de mensagem
  mediaUrl?: string;    // URL da mídia (se aplicável)
  metadata?: Record<string, any>;
}

export interface IncomingMessage {
  from: string;         // Número do remetente
  content: string;      // Conteúdo da mensagem
  timestamp: Date;      // Quando foi recebida
  messageId: string;    // ID único da mensagem
  type?: 'text' | 'image' | 'document';
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

export interface MessageDeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  error?: string;
}

export interface IMessagingGateway {
  /**
   * Envia uma mensagem
   */
  sendMessage(message: OutgoingMessage): Promise<MessageDeliveryStatus>;
  
  /**
   * Envia múltiplas mensagens
   */
  sendMessages(messages: OutgoingMessage[]): Promise<MessageDeliveryStatus[]>;
  
  /**
   * Verifica status de entrega de uma mensagem
   */
  getDeliveryStatus(messageId: string): Promise<MessageDeliveryStatus>;
  
  /**
   * Verifica se um número está registrado no WhatsApp
   */
  checkPhoneNumber(phone: string): Promise<boolean>;
}
```

## Mock Implementation

```typescript
// infrastructure/mock-messaging-gateway.service.ts

@Injectable()
export class MockMessagingGateway implements IMessagingGateway {
  private readonly logger = new Logger(MockMessagingGateway.name);
  private sentMessages: Map<string, MessageDeliveryStatus> = new Map();
  
  async sendMessage(message: OutgoingMessage): Promise<MessageDeliveryStatus> {
    const messageId = randomUUID();
    
    // Simula envio
    this.logger.log('📤 Sending message (MOCK):', {
      messageId,
      to: message.to,
      content: message.content.substring(0, 50) + '...',
      type: message.type || 'text',
    });
    
    // Simula delay de rede
    await this.simulateDelay(100, 500);
    
    // Simula falha aleatória (5% de chance)
    const shouldFail = Math.random() < 0.05;
    
    const status: MessageDeliveryStatus = {
      messageId,
      status: shouldFail ? 'failed' : 'sent',
      timestamp: new Date(),
      error: shouldFail ? 'Network timeout (simulated)' : undefined,
    };
    
    this.sentMessages.set(messageId, status);
    
    // Simula progressão de status (sent → delivered → read)
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
    // Mock sempre retorna true (simula que número está registrado)
    this.logger.log(`✅ Checking phone number (MOCK): ${phone} - Valid`);
    return true;
  }
  
  /**
   * Simula delay de rede
   */
  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * Simula progressão de status de entrega
   */
  private simulateStatusProgression(messageId: string): void {
    // Após 2 segundos: delivered
    setTimeout(() => {
      const status = this.sentMessages.get(messageId);
      if (status) {
        status.status = 'delivered';
        status.timestamp = new Date();
        this.logger.log(`📬 Message delivered (MOCK): ${messageId}`);
      }
    }, 2000);
    
    // Após 5 segundos: read (70% de chance)
    setTimeout(() => {
      const shouldRead = Math.random() < 0.7;
      if (shouldRead) {
        const status = this.sentMessages.get(messageId);
        if (status) {
          status.status = 'read';
          status.timestamp = new Date();
          this.logger.log(`👀 Message read (MOCK): ${messageId}`);
        }
      }
    }, 5000);
  }
  
  /**
   * Método auxiliar para testes: limpar histórico
   */
  clearHistory(): void {
    this.sentMessages.clear();
  }
  
  /**
   * Método auxiliar para testes: obter histórico
   */
  getHistory(): MessageDeliveryStatus[] {
    return Array.from(this.sentMessages.values());
  }
}
```

## Endpoint de Teste

### Controller

```typescript
// infrastructure/test/test-messaging.controller.ts

@Controller('test/messaging')
export class TestMessagingController {
  constructor(
    @Inject('IEventBus') private readonly eventBus: IEventBus,
    @Inject('IMessagingGateway') 
    private readonly messagingGateway: IMessagingGateway,
  ) {}
  
  /**
   * Simula recebimento de mensagem do WhatsApp
   */
  @Post('simulate-message')
  async simulateIncomingMessage(@Body() dto: SimulateMessageDto) {
    const incomingMessage: IncomingMessage = {
      from: dto.from,
      content: dto.content,
      timestamp: new Date(),
      messageId: randomUUID(),
      type: dto.type || 'text',
      metadata: dto.metadata,
    };
    
    // TODO: Quando Conversation Aggregate estiver pronto (Fase 4),
    // gerar evento MessageReceived aqui
    
    return {
      success: true,
      message: 'Message simulated successfully',
      data: incomingMessage,
    };
  }
  
  /**
   * Testa envio de mensagem
   */
  @Post('send-test-message')
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
  
  /**
   * Lista histórico de mensagens enviadas (apenas mock)
   */
  @Get('history')
  async getHistory() {
    if (this.messagingGateway instanceof MockMessagingGateway) {
      return {
        messages: this.messagingGateway.getHistory(),
      };
    }
    
    throw new BadRequestException('History only available in mock mode');
  }
  
  /**
   * Limpa histórico (apenas mock)
   */
  @Delete('history')
  async clearHistory() {
    if (this.messagingGateway instanceof MockMessagingGateway) {
      this.messagingGateway.clearHistory();
      return { success: true, message: 'History cleared' };
    }
    
    throw new BadRequestException('Clear only available in mock mode');
  }
}
```

### DTOs

```typescript
// infrastructure/test/dtos/simulate-message.dto.ts

export class SimulateMessageDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  from: string;
  
  @IsString()
  @MinLength(1)
  content: string;
  
  @IsOptional()
  @IsEnum(['text', 'image', 'document'])
  type?: 'text' | 'image' | 'document';
  
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
  @IsEnum(['text', 'image', 'document'])
  type?: 'text' | 'image' | 'document';
}
```

## Module Configuration

```typescript
// messaging.module.ts

@Module({
  imports: [EventSourcingModule],
  controllers: [TestMessagingController],
  providers: [
    {
      provide: 'IMessagingGateway',
      useClass: MockMessagingGateway,
    },
  ],
  exports: ['IMessagingGateway'],
})
export class MessagingModule {}
```

## Variáveis de Ambiente

```bash
# .env
# Modo do messaging gateway: 'mock' | 'whatsapp'
MESSAGING_MODE=mock
```

## Testes

### Testes Unitários

```typescript
describe('MockMessagingGateway', () => {
  let gateway: MockMessagingGateway;
  
  beforeEach(() => {
    gateway = new MockMessagingGateway();
  });
  
  it('should send message successfully', async () => {
    const result = await gateway.sendMessage({
      to: '+5511999999999',
      content: 'Hello, World!',
    });
    
    expect(result.messageId).toBeDefined();
    expect(result.status).toBe('sent');
  });
  
  it('should get delivery status', async () => {
    const sent = await gateway.sendMessage({
      to: '+5511999999999',
      content: 'Test',
    });
    
    const status = await gateway.getDeliveryStatus(sent.messageId);
    expect(status.messageId).toBe(sent.messageId);
  });
  
  it('should check phone number', async () => {
    const isValid = await gateway.checkPhoneNumber('+5511999999999');
    expect(isValid).toBe(true);
  });
  
  it('should clear history', () => {
    gateway.clearHistory();
    const history = gateway.getHistory();
    expect(history).toHaveLength(0);
  });
});
```

### Testes E2E

```typescript
describe('Test Messaging API (e2e)', () => {
  it('POST /test/messaging/simulate-message', async () => {
    const response = await request(app.getHttpServer())
      .post('/test/messaging/simulate-message')
      .send({
        from: '+5511999999999',
        content: 'Olá, quero agendar consulta',
      })
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.messageId).toBeDefined();
  });
  
  it('POST /test/messaging/send-test-message', async () => {
    const response = await request(app.getHttpServer())
      .post('/test/messaging/send-test-message')
      .send({
        to: '+5511999999999',
        content: 'Consulta agendada!',
      })
      .expect(201);
    
    expect(response.body.delivery_status.status).toBe('sent');
  });
  
  it('GET /test/messaging/history', async () => {
    // Send message first
    await request(app.getHttpServer())
      .post('/test/messaging/send-test-message')
      .send({
        to: '+5511999999999',
        content: 'Test',
      });
    
    // Get history
    const response = await request(app.getHttpServer())
      .get('/test/messaging/history')
      .expect(200);
    
    expect(response.body.messages.length).toBeGreaterThan(0);
  });
});
```

## Exemplos de Uso

### Simular recebimento de mensagem

```bash
curl -X POST http://localhost:3001/api/test/messaging/simulate-message \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+5511999999999",
    "content": "Oi, quero marcar consulta"
  }'
```

### Testar envio de mensagem

```bash
curl -X POST http://localhost:3001/api/test/messaging/send-test-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5511999999999",
    "content": "Consulta agendada para amanhã às 14h!"
  }'
```

### Ver histórico de mensagens enviadas

```bash
curl http://localhost:3001/api/test/messaging/history
```

## Checklist de Implementação

- [ ] Criar interface IMessagingGateway
- [ ] Implementar MockMessagingGateway
- [ ] Criar DTOs de validação
- [ ] Implementar TestMessagingController
- [ ] Configurar MessagingModule
- [ ] Criar testes unitários do mock
- [ ] Criar testes E2E dos endpoints
- [ ] Documentar exemplos de uso
- [ ] Validar manualmente via Postman/curl

## Resultado Esperado

Ao final desta fase, você deve ter:

1. ✅ Interface IMessagingGateway definida
2. ✅ MockMessagingGateway funcionando
3. ✅ Endpoint para simular mensagens recebidas
4. ✅ Endpoint para testar envio de mensagens
5. ✅ Logging de mensagens enviadas
6. ✅ Testes passando
7. ✅ Infraestrutura pronta para substituir por WhatsApp real (Fase 8)

**Validação:** 
1. Enviar mensagem de teste e verificar log
2. Simular recebimento de mensagem
3. Consultar histórico de mensagens
4. Verificar progressão de status (sent → delivered → read)

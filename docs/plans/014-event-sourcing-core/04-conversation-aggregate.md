# Fase 4: Conversation Aggregate

## Objetivo

Implementar o agregado Conversation que gerencia a comunicação entre pacientes e o sistema via WhatsApp, incluindo detecção de intenções e gerenciamento de contexto conversacional.

## Pré-requisitos

- ✅ Fase 1 concluída (Event Store Foundation)
- ✅ Fase 2 concluída (Patient Aggregate)

## Escopo

### O que será implementado

1. **Agregado Conversation** - Lógica de conversas
2. **Eventos** - MessageReceived, MessageSent, IntentDetected, ConversationStarted, ConversationEscalated
3. **Projection** - conversation_view, message_view
4. **Event Handlers** - Atualizam projections
5. **Command Handlers** - Processam comandos
6. **API REST temporária** - Para testes

### O que NÃO será implementado

- ❌ IA real para detecção de intenções (Fase 5 - Carol Mock)
- ❌ Integração WhatsApp real (Fase 8)
- ❌ Jornada do paciente (Fase 7)

## Eventos

### 1. ConversationStarted

```typescript
export interface ConversationStartedData {
  conversation_id: string;
  patient_id: string;
  clinic_id: string;
  tenant_id: string;
  channel: 'whatsapp' | 'web' | 'sms';
  started_by: 'patient' | 'agent' | 'system';
}

export class ConversationStarted implements DomainEvent<ConversationStartedData> {
  readonly event_type = 'ConversationStarted';
  readonly aggregate_type = 'Conversation';
  // ... implementation similar to PatientRegistered
}
```

### 2. MessageReceived

```typescript
export interface MessageReceivedData {
  conversation_id: string;
  message_id: string;
  from_phone: string;
  content: string;
  message_type: 'text' | 'image' | 'document';
  media_url?: string;
  received_at: string; // ISO 8601
}

export class MessageReceived implements DomainEvent<MessageReceivedData> {
  readonly event_type = 'MessageReceived';
  readonly aggregate_type = 'Conversation';
  // ... implementation
}
```

### 3. MessageSent

```typescript
export interface MessageSentData {
  conversation_id: string;
  message_id: string;
  to_phone: string;
  content: string;
  message_type: 'text' | 'image' | 'document';
  media_url?: string;
  sent_by: 'bot' | 'agent' | 'system';
  sent_at: string;
}

export class MessageSent implements DomainEvent<MessageSentData> {
  readonly event_type = 'MessageSent';
  readonly aggregate_type = 'Conversation';
  // ... implementation
}
```

### 4. IntentDetected

```typescript
export interface IntentDetectedData {
  conversation_id: string;
  message_id: string;
  intent: string; // 'schedule_appointment' | 'cancel_appointment' | 'confirm_appointment' | etc
  confidence: number; // 0.0 to 1.0
  entities?: Record<string, any>; // Extracted entities (date, time, etc)
  detected_at: string;
}

export class IntentDetected implements DomainEvent<IntentDetectedData> {
  readonly event_type = 'IntentDetected';
  readonly aggregate_type = 'Conversation';
  // ... implementation
}
```

### 5. ConversationEscalated

```typescript
export interface ConversationEscalatedData {
  conversation_id: string;
  reason: 'manual_request' | 'low_confidence' | 'sensitive_topic' | 'error';
  escalated_to_user_id?: string;
  escalated_at: string;
}

export class ConversationEscalated implements DomainEvent<ConversationEscalatedData> {
  readonly event_type = 'ConversationEscalated';
  readonly aggregate_type = 'Conversation';
  // ... implementation
}
```

## Agregado Conversation

```typescript
// domain/conversation.aggregate.ts

export type ConversationStatus = 'active' | 'escalated' | 'resolved' | 'abandoned';

export class Conversation extends AggregateRoot {
  private conversationId: string;
  private patientId: string;
  private clinicId: string;
  private tenantId: string;
  private status: ConversationStatus;
  private channel: 'whatsapp' | 'web' | 'sms';
  private isEscalated: boolean;
  private escalatedToUserId?: string;
  private consecutiveBotMessages: number;
  private lastMessageAt?: Date;
  
  private constructor() {
    super();
  }
  
  /**
   * Iniciar nova conversa
   */
  static start(params: {
    conversationId: string;
    patientId: string;
    clinicId: string;
    tenantId: string;
    channel: 'whatsapp' | 'web' | 'sms';
    startedBy: 'patient' | 'agent' | 'system';
    correlationId: string;
    userId?: string;
  }): Conversation {
    const conversation = new Conversation();
    
    const event = new ConversationStarted({
      aggregate_id: params.conversationId,
      aggregate_version: 1,
      tenant_id: params.tenantId,
      clinic_id: params.clinicId,
      correlation_id: params.correlationId,
      user_id: params.userId,
      event_data: {
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
  
  /**
   * Receber mensagem do paciente
   */
  receiveMessage(params: {
    messageId: string;
    fromPhone: string;
    content: string;
    messageType?: 'text' | 'image' | 'document';
    mediaUrl?: string;
    correlationId: string;
    causationId?: string;
  }): void {
    // Validações
    if (this.status === 'resolved') {
      throw new Error('Cannot receive message on resolved conversation');
    }
    
    const event = new MessageReceived({
      aggregate_id: this.conversationId,
      aggregate_version: this.version + 1,
      tenant_id: this.tenantId,
      clinic_id: this.clinicId,
      correlation_id: params.correlationId,
      causation_id: params.causationId,
      event_data: {
        conversation_id: this.conversationId,
        message_id: params.messageId,
        from_phone: params.fromPhone,
        content: params.content,
        message_type: params.messageType || 'text',
        media_url: params.mediaUrl,
        received_at: new Date().toISOString(),
      },
    });
    
    this.addEvent(event);
  }
  
  /**
   * Enviar mensagem para o paciente
   */
  sendMessage(params: {
    messageId: string;
    toPhone: string;
    content: string;
    messageType?: 'text' | 'image' | 'document';
    mediaUrl?: string;
    sentBy: 'bot' | 'agent' | 'system';
    correlationId: string;
    causationId?: string;
  }): void {
    // Validações
    if (this.status === 'resolved') {
      throw new Error('Cannot send message on resolved conversation');
    }
    
    // Regra: Não enviar mais de 3 mensagens consecutivas do bot
    if (params.sentBy === 'bot' && this.consecutiveBotMessages >= 3) {
      throw new Error('Cannot send more than 3 consecutive bot messages');
    }
    
    const event = new MessageSent({
      aggregate_id: this.conversationId,
      aggregate_version: this.version + 1,
      tenant_id: this.tenantId,
      clinic_id: this.clinicId,
      correlation_id: params.correlationId,
      causation_id: params.causationId,
      event_data: {
        conversation_id: this.conversationId,
        message_id: params.messageId,
        to_phone: params.toPhone,
        content: params.content,
        message_type: params.messageType || 'text',
        media_url: params.mediaUrl,
        sent_by: params.sentBy,
        sent_at: new Date().toISOString(),
      },
    });
    
    this.addEvent(event);
  }
  
  /**
   * Detectar intenção da mensagem
   */
  detectIntent(params: {
    messageId: string;
    intent: string;
    confidence: number;
    entities?: Record<string, any>;
    correlationId: string;
    causationId?: string;
  }): void {
    const event = new IntentDetected({
      aggregate_id: this.conversationId,
      aggregate_version: this.version + 1,
      tenant_id: this.tenantId,
      clinic_id: this.clinicId,
      correlation_id: params.correlationId,
      causation_id: params.causationId,
      event_data: {
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
  
  /**
   * Escalar para atendimento humano
   */
  escalate(params: {
    reason: 'manual_request' | 'low_confidence' | 'sensitive_topic' | 'error';
    escalatedToUserId?: string;
    correlationId: string;
    causationId?: string;
  }): void {
    if (this.isEscalated) {
      throw new Error('Conversation already escalated');
    }
    
    const event = new ConversationEscalated({
      aggregate_id: this.conversationId,
      aggregate_version: this.version + 1,
      tenant_id: this.tenantId,
      clinic_id: this.clinicId,
      correlation_id: params.correlationId,
      causation_id: params.causationId,
      event_data: {
        conversation_id: this.conversationId,
        reason: params.reason,
        escalated_to_user_id: params.escalatedToUserId,
        escalated_at: new Date().toISOString(),
      },
    });
    
    this.addEvent(event);
  }
  
  protected apply(event: DomainEvent): void {
    switch (event.event_type) {
      case 'ConversationStarted':
        this.applyConversationStarted(event as ConversationStarted);
        break;
      case 'MessageReceived':
        this.applyMessageReceived(event as MessageReceived);
        break;
      case 'MessageSent':
        this.applyMessageSent(event as MessageSent);
        break;
      case 'IntentDetected':
        this.applyIntentDetected(event as IntentDetected);
        break;
      case 'ConversationEscalated':
        this.applyConversationEscalated(event as ConversationEscalated);
        break;
    }
  }
  
  private applyConversationStarted(event: ConversationStarted): void {
    this.id = event.aggregate_id;
    this.conversationId = event.event_data.conversation_id;
    this.patientId = event.event_data.patient_id;
    this.clinicId = event.event_data.clinic_id;
    this.tenantId = event.event_data.tenant_id;
    this.channel = event.event_data.channel;
    this.status = 'active';
    this.isEscalated = false;
    this.consecutiveBotMessages = 0;
  }
  
  private applyMessageReceived(event: MessageReceived): void {
    this.consecutiveBotMessages = 0; // Reset contador
    this.lastMessageAt = new Date(event.event_data.received_at);
  }
  
  private applyMessageSent(event: MessageSent): void {
    if (event.event_data.sent_by === 'bot') {
      this.consecutiveBotMessages++;
    } else {
      this.consecutiveBotMessages = 0;
    }
    this.lastMessageAt = new Date(event.event_data.sent_at);
  }
  
  private applyIntentDetected(event: IntentDetected): void {
    // State não muda, apenas registra
  }
  
  private applyConversationEscalated(event: ConversationEscalated): void {
    this.isEscalated = true;
    this.status = 'escalated';
    this.escalatedToUserId = event.event_data.escalated_to_user_id;
  }
  
  // Getters
  getConversationId(): string { return this.conversationId; }
  getPatientId(): string { return this.patientId; }
  getStatus(): ConversationStatus { return this.status; }
  isEscalatedToHuman(): boolean { return this.isEscalated; }
}
```

## Projections

### conversation_view Table

```sql
CREATE TABLE conversation_view (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  clinic_id UUID NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  channel VARCHAR(20) NOT NULL,
  
  is_escalated BOOLEAN DEFAULT FALSE,
  escalated_to_user_id UUID,
  escalated_at TIMESTAMP WITH TIME ZONE,
  
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  FOREIGN KEY (patient_id) REFERENCES patient_view(id)
);

CREATE INDEX idx_conversation_view_patient ON conversation_view (patient_id);
CREATE INDEX idx_conversation_view_status ON conversation_view (status);
CREATE INDEX idx_conversation_view_escalated ON conversation_view (is_escalated);
```

### message_view Table

```sql
CREATE TABLE message_view (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  
  direction VARCHAR(10) NOT NULL, -- 'incoming' | 'outgoing'
  from_phone VARCHAR(20),
  to_phone VARCHAR(20),
  
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  media_url TEXT,
  
  sent_by VARCHAR(20), -- 'bot' | 'agent' | 'system' | 'patient'
  
  intent VARCHAR(50),
  intent_confidence DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  FOREIGN KEY (conversation_id) REFERENCES conversation_view(id)
);

CREATE INDEX idx_message_view_conversation ON message_view (conversation_id);
CREATE INDEX idx_message_view_created_at ON message_view (created_at DESC);
CREATE INDEX idx_message_view_intent ON message_view (intent);
```

## Command Handlers

### ReceiveMessageHandler

```typescript
@Injectable()
export class ReceiveMessageHandler {
  constructor(
    @Inject('IEventStore') private readonly eventStore: IEventStore,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
    @Inject('IIntentDetector') private readonly intentDetector: IIntentDetector,
  ) {}
  
  async execute(command: ReceiveMessageCommand): Promise<void> {
    const correlationId = CorrelationUtil.generate('receive-message');
    
    // Carregar ou criar conversa
    let conversation: Conversation;
    const existingEvents = await this.eventStore.getByAggregateId(
      'Conversation',
      command.conversationId,
    );
    
    if (existingEvents.length === 0) {
      // Nova conversa
      conversation = Conversation.start({
        conversationId: command.conversationId,
        patientId: command.patientId,
        clinicId: command.clinicId,
        tenantId: command.tenantId,
        channel: 'whatsapp',
        startedBy: 'patient',
        correlationId,
      });
    } else {
      // Conversa existente
      conversation = new Conversation();
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
    
    // Detectar intenção (usando mock por enquanto)
    const detection = await this.intentDetector.detectIntent(command.content);
    
    if (detection.intent !== 'unknown') {
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

## Testes

### Testes do Agregado

```typescript
describe('Conversation Aggregate', () => {
  it('should start new conversation', () => {
    const conversation = Conversation.start({
      conversationId: 'conv-123',
      patientId: 'patient-123',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      channel: 'whatsapp',
      startedBy: 'patient',
      correlationId: 'corr-1',
    });
    
    const events = conversation.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('ConversationStarted');
  });
  
  it('should receive message', () => {
    const conversation = Conversation.start({...});
    conversation.clearUncommittedEvents();
    
    conversation.receiveMessage({
      messageId: 'msg-1',
      fromPhone: '+5511999999999',
      content: 'Olá',
      correlationId: 'corr-2',
    });
    
    const events = conversation.getUncommittedEvents();
    expect(events[0].event_type).toBe('MessageReceived');
  });
  
  it('should not allow more than 3 consecutive bot messages', () => {
    const conversation = Conversation.start({...});
    
    conversation.sendMessage({ sentBy: 'bot', ... });
    conversation.sendMessage({ sentBy: 'bot', ... });
    conversation.sendMessage({ sentBy: 'bot', ... });
    
    expect(() => {
      conversation.sendMessage({ sentBy: 'bot', ... });
    }).toThrow('Cannot send more than 3 consecutive bot messages');
  });
});
```

## Checklist de Implementação

- [ ] Criar eventos (ConversationStarted, MessageReceived, MessageSent, IntentDetected, ConversationEscalated)
- [ ] Implementar agregado Conversation
- [ ] Criar migrations (conversation_view, message_view)
- [ ] Implementar entities (ConversationViewEntity, MessageViewEntity)
- [ ] Implementar event handlers (projections)
- [ ] Implementar command handlers
- [ ] Criar DTOs
- [ ] Implementar controller REST
- [ ] Integrar com IIntentDetector (mock da Fase 5)
- [ ] Criar testes unitários
- [ ] Criar testes de integração
- [ ] Criar testes E2E
- [ ] Validar fluxo completo

## Resultado Esperado

Ao final desta fase, você deve ter:

1. ✅ Agregado Conversation funcionando
2. ✅ Fluxo de recebimento de mensagens completo
3. ✅ Detecção de intenção (mock)
4. ✅ Projections atualizadas
5. ✅ API REST para testes
6. ✅ Testes passando

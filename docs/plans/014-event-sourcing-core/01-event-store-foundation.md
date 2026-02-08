# Fase 1: Event Store Foundation

## Objetivo

Implementar a infraestrutura base de Event Sourcing, incluindo Event Store (PostgreSQL), Event Bus (RabbitMQ), tipos base e abstrações que serão usadas por todos os agregados.

## Escopo

### O que será implementado

1. **Event Store** - Armazenamento de eventos no PostgreSQL
2. **Event Bus** - Sistema de pub/sub com RabbitMQ
3. **Tipos Base** - Interfaces e classes abstratas
4. **Infraestrutura NestJS** - Módulos e providers

### O que NÃO será implementado

- ❌ Agregados específicos (vem nas próximas fases)
- ❌ Projections/Read Models (cada agregado cria a sua)
- ❌ APIs REST (cada agregado cria a sua)

## Estrutura do Banco de Dados

### Tabela: events

```sql
CREATE TABLE events (
  -- Identificação
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  
  -- Agregado
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id UUID NOT NULL,
  aggregate_version INTEGER NOT NULL,
  
  -- Multi-tenant
  tenant_id UUID NOT NULL,
  clinic_id UUID,
  
  -- Rastreabilidade
  causation_id UUID,
  correlation_id UUID NOT NULL,
  user_id UUID,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Dados
  event_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Índices compostos são criados separadamente
  CONSTRAINT events_aggregate_version_unique UNIQUE (aggregate_id, aggregate_version)
);

-- Índices
CREATE INDEX idx_events_aggregate ON events (aggregate_type, aggregate_id);
CREATE INDEX idx_events_correlation ON events (correlation_id);
CREATE INDEX idx_events_causation ON events (causation_id);
CREATE INDEX idx_events_tenant ON events (tenant_id);
CREATE INDEX idx_events_type ON events (event_type);
CREATE INDEX idx_events_created_at ON events (created_at DESC);
CREATE INDEX idx_events_event_data ON events USING gin (event_data);
```

## Estrutura de Arquivos

```
apps/api/src/
├── modules/
│   └── event-sourcing/
│       ├── event-sourcing.module.ts
│       ├── domain/
│       │   ├── domain-event.interface.ts
│       │   ├── aggregate-root.abstract.ts
│       │   └── event-handler.interface.ts
│       ├── infrastructure/
│       │   ├── event-store/
│       │   │   ├── event-store.service.ts
│       │   │   ├── event-store.interface.ts
│       │   │   └── event-store.entity.ts
│       │   └── event-bus/
│       │       ├── event-bus.service.ts
│       │       ├── event-bus.interface.ts
│       │       ├── rabbitmq-event-bus.service.ts
│       │       └── event-subscriber.decorator.ts
│       └── utils/
│           └── correlation.util.ts
```

## Implementação Detalhada

### 1. Domain Event Interface

```typescript
// domain/domain-event.interface.ts

export interface DomainEvent<T = any> {
  // Identificação
  readonly event_id: string;
  readonly event_type: string;
  
  // Agregado
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly aggregate_version: number;
  
  // Multi-tenant
  readonly tenant_id: string;
  readonly clinic_id?: string;
  
  // Rastreabilidade
  readonly correlation_id: string;
  readonly causation_id?: string;
  readonly user_id?: string;
  
  // Timestamp
  readonly created_at: Date;
  
  // Dados
  readonly event_data: T;
  readonly metadata?: Record<string, any>;
}
```

### 2. Aggregate Root Base Class

```typescript
// domain/aggregate-root.abstract.ts

export abstract class AggregateRoot {
  protected id: string;
  protected version: number = 0;
  protected uncommittedEvents: DomainEvent[] = [];
  
  protected constructor() {}
  
  /**
   * Aplica um evento ao agregado
   */
  protected abstract apply(event: DomainEvent): void;
  
  /**
   * Adiciona evento à lista de uncommitted
   */
  protected addEvent(event: DomainEvent): void {
    this.apply(event);
    this.uncommittedEvents.push(event);
    this.version++;
  }
  
  /**
   * Reconstrói agregado a partir do histórico
   */
  public loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.apply(event);
      this.version = event.aggregate_version;
    }
  }
  
  /**
   * Retorna eventos não commitados
   */
  public getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }
  
  /**
   * Limpa eventos uncommitted (após salvar)
   */
  public clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }
  
  public getId(): string {
    return this.id;
  }
  
  public getVersion(): number {
    return this.version;
  }
}
```

### 3. Event Store Interface

```typescript
// infrastructure/event-store/event-store.interface.ts

export interface IEventStore {
  /**
   * Adiciona um evento ao store
   */
  append(event: DomainEvent): Promise<void>;
  
  /**
   * Adiciona múltiplos eventos (transação)
   */
  appendMany(events: DomainEvent[]): Promise<void>;
  
  /**
   * Busca eventos por agregado
   */
  getByAggregateId(
    aggregateType: string,
    aggregateId: string
  ): Promise<DomainEvent[]>;
  
  /**
   * Busca eventos por correlation_id
   */
  getByCorrelationId(correlationId: string): Promise<DomainEvent[]>;
  
  /**
   * Busca eventos por tipo
   */
  getByEventType(
    eventType: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DomainEvent[]>;
  
  /**
   * Busca eventos por tenant
   */
  getByTenant(
    tenantId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DomainEvent[]>;
}
```

### 4. Event Store Service

```typescript
// infrastructure/event-store/event-store.service.ts

@Injectable()
export class EventStoreService implements IEventStore {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
  ) {}
  
  async append(event: DomainEvent): Promise<void> {
    const entity = this.toEntity(event);
    await this.eventRepository.save(entity);
  }
  
  async appendMany(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    const entities = events.map(e => this.toEntity(e));
    
    await this.eventRepository.manager.transaction(async (manager) => {
      await manager.save(EventEntity, entities);
    });
  }
  
  async getByAggregateId(
    aggregateType: string,
    aggregateId: string
  ): Promise<DomainEvent[]> {
    const entities = await this.eventRepository.find({
      where: { aggregate_type: aggregateType, aggregate_id: aggregateId },
      order: { aggregate_version: 'ASC' },
    });
    
    return entities.map(e => this.toDomainEvent(e));
  }
  
  async getByCorrelationId(correlationId: string): Promise<DomainEvent[]> {
    const entities = await this.eventRepository.find({
      where: { correlation_id: correlationId },
      order: { created_at: 'ASC' },
    });
    
    return entities.map(e => this.toDomainEvent(e));
  }
  
  async getByEventType(
    eventType: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DomainEvent[]> {
    const entities = await this.eventRepository.find({
      where: { event_type: eventType },
      order: { created_at: 'DESC' },
      take: options?.limit,
      skip: options?.offset,
    });
    
    return entities.map(e => this.toDomainEvent(e));
  }
  
  async getByTenant(
    tenantId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DomainEvent[]> {
    const entities = await this.eventRepository.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
      take: options?.limit,
      skip: options?.offset,
    });
    
    return entities.map(e => this.toDomainEvent(e));
  }
  
  private toEntity(event: DomainEvent): EventEntity {
    const entity = new EventEntity();
    entity.event_id = event.event_id;
    entity.event_type = event.event_type;
    entity.aggregate_type = event.aggregate_type;
    entity.aggregate_id = event.aggregate_id;
    entity.aggregate_version = event.aggregate_version;
    entity.tenant_id = event.tenant_id;
    entity.clinic_id = event.clinic_id;
    entity.correlation_id = event.correlation_id;
    entity.causation_id = event.causation_id;
    entity.user_id = event.user_id;
    entity.created_at = event.created_at;
    entity.event_data = event.event_data;
    entity.metadata = event.metadata || {};
    return entity;
  }
  
  private toDomainEvent(entity: EventEntity): DomainEvent {
    return {
      event_id: entity.event_id,
      event_type: entity.event_type,
      aggregate_type: entity.aggregate_type,
      aggregate_id: entity.aggregate_id,
      aggregate_version: entity.aggregate_version,
      tenant_id: entity.tenant_id,
      clinic_id: entity.clinic_id,
      correlation_id: entity.correlation_id,
      causation_id: entity.causation_id,
      user_id: entity.user_id,
      created_at: entity.created_at,
      event_data: entity.event_data,
      metadata: entity.metadata,
    };
  }
}
```

### 5. Event Bus Interface

```typescript
// infrastructure/event-bus/event-bus.interface.ts

export interface IEventBus {
  /**
   * Publica um evento
   */
  publish(event: DomainEvent): Promise<void>;
  
  /**
   * Publica múltiplos eventos
   */
  publishMany(events: DomainEvent[]): Promise<void>;
  
  /**
   * Subscreve a um tipo de evento
   */
  subscribe(eventType: string, handler: EventHandler): void;
}

export interface EventHandler {
  handle(event: DomainEvent): Promise<void>;
}
```

### 6. RabbitMQ Event Bus Service

```typescript
// infrastructure/event-bus/rabbitmq-event-bus.service.ts

@Injectable()
export class RabbitMQEventBus implements IEventBus {
  private connection: AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private handlers: Map<string, EventHandler[]> = new Map();
  
  constructor(private readonly configService: ConfigService) {}
  
  async onModuleInit() {
    await this.connect();
    await this.setupExchange();
    await this.setupConsumer();
  }
  
  private async connect(): Promise<void> {
    const url = this.configService.get<string>('RABBITMQ_URL');
    
    this.connection = amqp.connect([url], {
      heartbeatIntervalInSeconds: 60,
    });
    
    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: Channel) => {
        // Exchange para eventos
        await channel.assertExchange('healz.events', 'topic', {
          durable: true,
        });
        
        // Dead Letter Exchange
        await channel.assertExchange('healz.events.dlx', 'topic', {
          durable: true,
        });
      },
    });
  }
  
  private async setupExchange(): Promise<void> {
    // Já configurado no setup do channel
  }
  
  private async setupConsumer(): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: Channel) => {
      // Queue para processar eventos
      const queueName = 'healz.events.consumer';
      
      await channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'healz.events.dlx',
          'x-dead-letter-routing-key': 'failed',
        },
      });
      
      // Bind queue ao exchange (recebe todos os eventos)
      await channel.bindQueue(queueName, 'healz.events', '#');
      
      // Consume
      await channel.consume(queueName, async (msg) => {
        if (!msg) return;
        
        try {
          const event: DomainEvent = JSON.parse(msg.content.toString());
          await this.handleEvent(event);
          channel.ack(msg);
        } catch (error) {
          console.error('Error handling event:', error);
          // Rejeita e envia para DLQ
          channel.nack(msg, false, false);
        }
      });
    });
  }
  
  async publish(event: DomainEvent): Promise<void> {
    await this.channelWrapper.publish(
      'healz.events',
      event.event_type,
      event,
      {
        persistent: true,
        contentType: 'application/json',
      }
    );
  }
  
  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
  
  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType)!.push(handler);
  }
  
  private async handleEvent(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.event_type) || [];
    
    for (const handler of handlers) {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`Error in handler for ${event.event_type}:`, error);
        throw error; // Re-throw para triggerar retry
      }
    }
  }
  
  async onModuleDestroy() {
    await this.channelWrapper.close();
    await this.connection.close();
  }
}
```

### 7. Event Subscriber Decorator

```typescript
// infrastructure/event-bus/event-subscriber.decorator.ts

export const EVENT_HANDLER_METADATA = 'EVENT_HANDLER_METADATA';

export interface EventHandlerMetadata {
  eventTypes: string[];
}

export function EventSubscriber(...eventTypes: string[]): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(EVENT_HANDLER_METADATA, { eventTypes }, target);
  };
}

// Helper para extrair metadata
export function getEventHandlerMetadata(target: any): EventHandlerMetadata | undefined {
  return Reflect.getMetadata(EVENT_HANDLER_METADATA, target);
}
```

### 8. Correlation Util

```typescript
// utils/correlation.util.ts

import { randomUUID } from 'crypto';

export class CorrelationUtil {
  /**
   * Gera novo correlation_id com prefixo
   */
  static generate(prefix?: string): string {
    const uuid = randomUUID();
    return prefix ? `${prefix}-${uuid}` : uuid;
  }
  
  /**
   * Propaga correlation_id existente ou gera novo
   */
  static propagateOrGenerate(existing?: string, prefix?: string): string {
    return existing || this.generate(prefix);
  }
}
```

### 9. Event Sourcing Module

```typescript
// event-sourcing.module.ts

@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity]),
    ConfigModule,
  ],
  providers: [
    EventStoreService,
    {
      provide: 'IEventStore',
      useClass: EventStoreService,
    },
    RabbitMQEventBus,
    {
      provide: 'IEventBus',
      useClass: RabbitMQEventBus,
    },
  ],
  exports: [
    'IEventStore',
    'IEventBus',
    EventStoreService,
    RabbitMQEventBus,
  ],
})
export class EventSourcingModule {}
```

## Configuração RabbitMQ

### docker-compose.yml

```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: healz-rabbitmq
    ports:
      - "5672:5672"   # AMQP
      - "15672:15672" # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: healz
      RABBITMQ_DEFAULT_PASS: healz123
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - healz-network

volumes:
  rabbitmq_data:
```

### .env

```bash
# RabbitMQ
RABBITMQ_URL=amqp://healz:healz123@localhost:5672
```

## Testes

### Testes Unitários

```typescript
// event-store.service.spec.ts
describe('EventStoreService', () => {
  it('should append event', async () => {
    // Test implementation
  });
  
  it('should get events by aggregate id', async () => {
    // Test implementation
  });
  
  it('should get events by correlation id', async () => {
    // Test implementation
  });
  
  it('should handle optimistic locking', async () => {
    // Test duplicate version
  });
});
```

### Testes de Integração

```typescript
// rabbitmq-event-bus.integration.spec.ts
describe('RabbitMQEventBus (Integration)', () => {
  it('should publish and consume event', async () => {
    // Test pub/sub
  });
  
  it('should send failed events to DLQ', async () => {
    // Test error handling
  });
});
```

## Checklist de Implementação

- [ ] Criar migration da tabela `events`
- [ ] Implementar EventEntity (TypeORM)
- [ ] Implementar DomainEvent interface
- [ ] Implementar AggregateRoot base class
- [ ] Implementar EventStore service
- [ ] Implementar RabbitMQ Event Bus
- [ ] Implementar Event Subscriber decorator
- [ ] Configurar docker-compose com RabbitMQ
- [ ] Criar testes unitários do EventStore
- [ ] Criar testes de integração do Event Bus
- [ ] Validar funcionamento end-to-end com evento de teste
- [ ] Documentar uso básico

## Resultado Esperado

Ao final desta fase, você deve ter:

1. ✅ Tabela `events` criada e funcional
2. ✅ EventStore salvando eventos no PostgreSQL
3. ✅ RabbitMQ publicando e consumindo eventos
4. ✅ Tipos base prontos para uso
5. ✅ Testes passando
6. ✅ Infraestrutura pronta para implementar agregados

**Validação:** Criar um evento de teste manualmente, salvá-lo no EventStore e verificar que ele é publicado e consumido via RabbitMQ.

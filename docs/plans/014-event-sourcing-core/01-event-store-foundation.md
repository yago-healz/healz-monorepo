# Fase 1: Event Store Foundation

## Objetivo

Implementar a infraestrutura base de Event Sourcing, incluindo Event Store (PostgreSQL via Drizzle), Event Bus (RabbitMQ), tipos base e abstracoes que serao usadas por todos os agregados.

## Escopo

### O que sera implementado

1. **Event Store** - Armazenamento de eventos no PostgreSQL via Drizzle ORM
2. **Event Bus** - Sistema de pub/sub com RabbitMQ
3. **Tipos Base** - Interfaces e classes abstratas (DomainEvent, AggregateRoot)
4. **Infraestrutura NestJS** - Modulos e providers

### O que NAO sera implementado

- Agregados especificos (vem nas proximas fases)
- Projections/Read Models (cada agregado cria a sua)
- APIs REST (cada agregado cria a sua)

## Estrutura do Banco de Dados

### Schema Drizzle: events

```typescript
// src/db/schema/events.schema.ts

import {
  pgTable, bigserial, uuid, varchar, integer,
  timestamp, jsonb, uniqueIndex, index,
} from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  // Identificacao
  id: bigserial("id", { mode: "number" }).primaryKey(),
  eventId: uuid("event_id").notNull().unique().defaultRandom(),
  eventType: varchar("event_type", { length: 100 }).notNull(),

  // Agregado
  aggregateType: varchar("aggregate_type", { length: 50 }).notNull(),
  aggregateId: uuid("aggregate_id").notNull(),
  aggregateVersion: integer("aggregate_version").notNull(),

  // Multi-tenant
  tenantId: uuid("tenant_id").notNull(),
  clinicId: uuid("clinic_id"),

  // Rastreabilidade
  causationId: uuid("causation_id"),
  correlationId: uuid("correlation_id").notNull(),
  userId: uuid("user_id"),

  // Timestamp
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  // Dados
  eventData: jsonb("event_data").notNull(),
  metadata: jsonb("metadata").default({}),
}, (table) => [
  // Optimistic locking: aggregate_id + version deve ser unico
  uniqueIndex("events_aggregate_version_unique")
    .on(table.aggregateId, table.aggregateVersion),

  // Indices para queries comuns
  index("idx_events_aggregate").on(table.aggregateType, table.aggregateId),
  index("idx_events_correlation").on(table.correlationId),
  index("idx_events_causation").on(table.causationId),
  index("idx_events_tenant").on(table.tenantId),
  index("idx_events_type").on(table.eventType),
  index("idx_events_created_at").on(table.createdAt),
]);
```

**Nota:** Adicionar `export * from "./events.schema"` no `src/db/schema/index.ts` e rodar `pnpm db:generate && pnpm db:migrate`.

## Estrutura de Arquivos

```
apps/api/src/
+-- db/
|   +-- schema/
|   |   +-- events.schema.ts          # NOVO - Schema da tabela events
|   |   +-- index.ts                  # Atualizar com export
|   +-- index.ts                      # Ja existe - pool + schema exports
+-- event-sourcing/
|   +-- event-sourcing.module.ts
|   +-- domain/
|   |   +-- domain-event.interface.ts
|   |   +-- aggregate-root.ts
|   |   +-- event-handler.interface.ts
|   +-- event-store/
|   |   +-- event-store.service.ts
|   |   +-- event-store.interface.ts
|   +-- event-bus/
|   |   +-- event-bus.service.ts
|   |   +-- event-bus.interface.ts
|   |   +-- rabbitmq-event-bus.service.ts
|   +-- utils/
|       +-- correlation.util.ts
```

## Implementacao Detalhada

### 1. Domain Event Interface

```typescript
// event-sourcing/domain/domain-event.interface.ts

export interface DomainEvent<T = any> {
  readonly event_id: string;
  readonly event_type: string;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly aggregate_version: number;
  readonly tenant_id: string;
  readonly clinic_id?: string;
  readonly correlation_id: string;
  readonly causation_id?: string;
  readonly user_id?: string;
  readonly created_at: Date;
  readonly event_data: T;
  readonly metadata?: Record<string, any>;
}
```

### 2. Aggregate Root Base Class

```typescript
// event-sourcing/domain/aggregate-root.ts

import { DomainEvent } from "./domain-event.interface";

export abstract class AggregateRoot {
  protected id: string;
  protected version: number = 0;
  protected uncommittedEvents: DomainEvent[] = [];

  protected constructor() {}

  /**
   * Cada agregado implementa como aplicar cada tipo de evento ao seu estado
   */
  protected abstract applyEvent(event: DomainEvent): void;

  /**
   * Gera evento: aplica ao estado e adiciona na lista de uncommitted
   */
  protected addEvent(event: DomainEvent): void {
    this.applyEvent(event);
    this.uncommittedEvents.push(event);
    this.version++;
  }

  /**
   * Reconstroi agregado a partir do historico de eventos
   */
  public loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.applyEvent(event);
      this.version = event.aggregate_version;
    }
  }

  public getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

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

### 3. Event Handler Interface

```typescript
// event-sourcing/domain/event-handler.interface.ts

import { DomainEvent } from "./domain-event.interface";

export interface IEventHandler {
  handle(event: DomainEvent): Promise<void>;
}
```

### 4. Event Store Interface

```typescript
// event-sourcing/event-store/event-store.interface.ts

import { DomainEvent } from "../domain/domain-event.interface";

export interface IEventStore {
  append(event: DomainEvent): Promise<void>;
  appendMany(events: DomainEvent[]): Promise<void>;
  getByAggregateId(aggregateType: string, aggregateId: string): Promise<DomainEvent[]>;
  getByCorrelationId(correlationId: string): Promise<DomainEvent[]>;
  getByEventType(eventType: string, options?: { limit?: number; offset?: number }): Promise<DomainEvent[]>;
  getByTenant(tenantId: string, options?: { limit?: number; offset?: number }): Promise<DomainEvent[]>;
}
```

### 5. Event Store Service (Drizzle)

```typescript
// event-sourcing/event-store/event-store.service.ts

import { Injectable } from "@nestjs/common";
import { eq, and, asc, desc } from "drizzle-orm";
import { db, events } from "../../db";
import { DomainEvent } from "../domain/domain-event.interface";
import { IEventStore } from "./event-store.interface";

@Injectable()
export class EventStoreService implements IEventStore {

  async append(event: DomainEvent): Promise<void> {
    await db.insert(events).values({
      eventId: event.event_id,
      eventType: event.event_type,
      aggregateType: event.aggregate_type,
      aggregateId: event.aggregate_id,
      aggregateVersion: event.aggregate_version,
      tenantId: event.tenant_id,
      clinicId: event.clinic_id,
      correlationId: event.correlation_id,
      causationId: event.causation_id,
      userId: event.user_id,
      createdAt: event.created_at,
      eventData: event.event_data,
      metadata: event.metadata || {},
    });
  }

  async appendMany(eventsToSave: DomainEvent[]): Promise<void> {
    if (eventsToSave.length === 0) return;

    // Drizzle suporta insert de multiplos registros em uma transacao
    await db.transaction(async (tx) => {
      for (const event of eventsToSave) {
        await tx.insert(events).values({
          eventId: event.event_id,
          eventType: event.event_type,
          aggregateType: event.aggregate_type,
          aggregateId: event.aggregate_id,
          aggregateVersion: event.aggregate_version,
          tenantId: event.tenant_id,
          clinicId: event.clinic_id,
          correlationId: event.correlation_id,
          causationId: event.causation_id,
          userId: event.user_id,
          createdAt: event.created_at,
          eventData: event.event_data,
          metadata: event.metadata || {},
        });
      }
    });
  }

  async getByAggregateId(
    aggregateType: string,
    aggregateId: string,
  ): Promise<DomainEvent[]> {
    const rows = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.aggregateType, aggregateType),
          eq(events.aggregateId, aggregateId),
        ),
      )
      .orderBy(asc(events.aggregateVersion));

    return rows.map(this.toDomainEvent);
  }

  async getByCorrelationId(correlationId: string): Promise<DomainEvent[]> {
    const rows = await db
      .select()
      .from(events)
      .where(eq(events.correlationId, correlationId))
      .orderBy(asc(events.createdAt));

    return rows.map(this.toDomainEvent);
  }

  async getByEventType(
    eventType: string,
    options?: { limit?: number; offset?: number },
  ): Promise<DomainEvent[]> {
    let query = db
      .select()
      .from(events)
      .where(eq(events.eventType, eventType))
      .orderBy(desc(events.createdAt));

    if (options?.limit) query = query.limit(options.limit) as any;
    if (options?.offset) query = query.offset(options.offset) as any;

    const rows = await query;
    return rows.map(this.toDomainEvent);
  }

  async getByTenant(
    tenantId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<DomainEvent[]> {
    let query = db
      .select()
      .from(events)
      .where(eq(events.tenantId, tenantId))
      .orderBy(desc(events.createdAt));

    if (options?.limit) query = query.limit(options.limit) as any;
    if (options?.offset) query = query.offset(options.offset) as any;

    const rows = await query;
    return rows.map(this.toDomainEvent);
  }

  private toDomainEvent(row: typeof events.$inferSelect): DomainEvent {
    return {
      event_id: row.eventId,
      event_type: row.eventType,
      aggregate_type: row.aggregateType,
      aggregate_id: row.aggregateId,
      aggregate_version: row.aggregateVersion,
      tenant_id: row.tenantId,
      clinic_id: row.clinicId ?? undefined,
      correlation_id: row.correlationId,
      causation_id: row.causationId ?? undefined,
      user_id: row.userId ?? undefined,
      created_at: row.createdAt,
      event_data: row.eventData,
      metadata: (row.metadata as Record<string, any>) ?? undefined,
    };
  }
}
```

### 6. Event Bus Interface

```typescript
// event-sourcing/event-bus/event-bus.interface.ts

import { DomainEvent } from "../domain/domain-event.interface";
import { IEventHandler } from "../domain/event-handler.interface";

export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
  subscribe(eventType: string, handler: IEventHandler): void;
}
```

### 7. RabbitMQ Event Bus Service

```typescript
// event-sourcing/event-bus/rabbitmq-event-bus.service.ts

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as amqp from "amqp-connection-manager";
import { ChannelWrapper } from "amqp-connection-manager";
import { Channel } from "amqplib";
import { DomainEvent } from "../domain/domain-event.interface";
import { IEventHandler } from "../domain/event-handler.interface";
import { IEventBus } from "./event-bus.interface";

@Injectable()
export class RabbitMQEventBus implements IEventBus, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQEventBus.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private handlers: Map<string, IEventHandler[]> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>("RABBITMQ_URL");

    this.connection = amqp.connect([url], {
      heartbeatIntervalInSeconds: 60,
    });

    this.connection.on("connect", () => {
      this.logger.log("Connected to RabbitMQ");
    });

    this.connection.on("disconnect", (err) => {
      this.logger.warn("Disconnected from RabbitMQ", err?.message);
    });

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: Channel) => {
        // Exchange principal para eventos
        await channel.assertExchange("healz.events", "topic", { durable: true });

        // Dead Letter Exchange para eventos com falha
        await channel.assertExchange("healz.events.dlx", "topic", { durable: true });

        // Queue principal
        const queueName = "healz.events.consumer";
        await channel.assertQueue(queueName, {
          durable: true,
          arguments: {
            "x-dead-letter-exchange": "healz.events.dlx",
            "x-dead-letter-routing-key": "failed",
          },
        });

        // Bind: recebe todos os eventos
        await channel.bindQueue(queueName, "healz.events", "#");

        // Dead Letter Queue
        await channel.assertQueue("healz.events.failed", { durable: true });
        await channel.bindQueue("healz.events.failed", "healz.events.dlx", "failed");

        // Consumer
        await channel.consume(queueName, async (msg) => {
          if (!msg) return;

          try {
            const event: DomainEvent = JSON.parse(msg.content.toString());
            await this.handleEvent(event);
            channel.ack(msg);
          } catch (error) {
            this.logger.error(`Error handling event: ${error.message}`, error.stack);
            channel.nack(msg, false, false); // Envia para DLQ
          }
        });
      },
    });
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.channelWrapper.publish(
      "healz.events",
      event.event_type,
      event,
      { persistent: true, contentType: "application/json" },
    );
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe(eventType: string, handler: IEventHandler): void {
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
        this.logger.error(
          `Handler error for ${event.event_type}: ${error.message}`,
          error.stack,
        );
        throw error; // Re-throw para triggerar retry/DLQ
      }
    }
  }

  async onModuleDestroy() {
    if (this.channelWrapper) await this.channelWrapper.close();
    if (this.connection) await this.connection.close();
  }
}
```

### 8. Correlation Util

```typescript
// event-sourcing/utils/correlation.util.ts

import { randomUUID } from "crypto";

export class CorrelationUtil {
  static generate(prefix?: string): string {
    const uuid = randomUUID();
    return prefix ? `${prefix}-${uuid}` : uuid;
  }

  static propagateOrGenerate(existing?: string, prefix?: string): string {
    return existing || this.generate(prefix);
  }
}
```

### 9. Event Sourcing Module

```typescript
// event-sourcing/event-sourcing.module.ts

import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventStoreService } from "./event-store/event-store.service";
import { RabbitMQEventBus } from "./event-bus/rabbitmq-event-bus.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    EventStoreService,
    {
      provide: "IEventStore",
      useExisting: EventStoreService,
    },
    RabbitMQEventBus,
    {
      provide: "IEventBus",
      useExisting: RabbitMQEventBus,
    },
  ],
  exports: ["IEventStore", "IEventBus", EventStoreService, RabbitMQEventBus],
})
export class EventSourcingModule {}
```

**Nota:** O modulo e `@Global()` para que todos os modulos de agregados possam injetar `IEventStore` e `IEventBus` sem precisar importar explicitamente.

## Configuracao Docker

### Adicionar ao docker/docker-compose.yml

```yaml
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: healz-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: healz
      RABBITMQ_DEFAULT_PASS: healz123
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
```

E adicionar `rabbitmq_data:` ao bloco `volumes:`.

### .env

```bash
# RabbitMQ
RABBITMQ_URL=amqp://healz:healz123@localhost:5672
```

## Dependencias a Instalar

```bash
cd apps/api && pnpm add amqplib amqp-connection-manager
cd apps/api && pnpm add -D @types/amqplib
```

## Registro no AppModule

Adicionar `EventSourcingModule` ao array de imports do `AppModule`:

```typescript
// app.module.ts
import { EventSourcingModule } from "./event-sourcing/event-sourcing.module";

@Module({
  imports: [
    // ... imports existentes
    EventSourcingModule,
  ],
  // ...
})
```

## Testes

### Testes Unitarios

```typescript
// event-sourcing/event-store/event-store.service.spec.ts
describe("EventStoreService", () => {
  it("should append event", async () => {
    // Testar insert no banco
  });

  it("should get events by aggregate id ordered by version", async () => {
    // Inserir 3 eventos e verificar ordem
  });

  it("should get events by correlation id", async () => {
    // Inserir eventos com mesmo correlation_id
  });

  it("should reject duplicate aggregate_version (optimistic locking)", async () => {
    // Tentar inserir dois eventos com mesma version para o mesmo aggregate_id
    // Deve lancar erro de unique constraint
  });
});
```

### Testes de Integracao

```typescript
// event-sourcing/event-bus/rabbitmq-event-bus.integration.spec.ts
describe("RabbitMQEventBus (Integration)", () => {
  it("should publish and consume event", async () => {
    // Publicar evento e verificar que handler foi chamado
  });

  it("should send failed events to DLQ", async () => {
    // Registrar handler que falha e verificar DLQ
  });
});
```

## Checklist de Implementacao

- [ ] Criar schema Drizzle `events.schema.ts`
- [ ] Exportar no `schema/index.ts`
- [ ] Gerar e rodar migration (`pnpm db:generate && pnpm db:migrate`)
- [ ] Implementar `DomainEvent` interface
- [ ] Implementar `AggregateRoot` base class
- [ ] Implementar `IEventHandler` interface
- [ ] Implementar `IEventStore` interface
- [ ] Implementar `EventStoreService` (Drizzle queries)
- [ ] Implementar `IEventBus` interface
- [ ] Implementar `RabbitMQEventBus`
- [ ] Implementar `CorrelationUtil`
- [ ] Criar `EventSourcingModule` (global)
- [ ] Instalar dependencias (amqplib, amqp-connection-manager)
- [ ] Adicionar RabbitMQ ao docker-compose
- [ ] Adicionar RABBITMQ_URL ao .env
- [ ] Registrar no AppModule
- [ ] Criar testes unitarios do EventStore
- [ ] Criar testes de integracao do Event Bus
- [ ] Validar end-to-end com evento de teste

## Resultado Esperado

Ao final desta fase:

1. Tabela `events` criada via Drizzle migration
2. EventStore salvando/consultando eventos via Drizzle queries
3. RabbitMQ publicando e consumindo eventos
4. Tipos base prontos para uso por todos os agregados
5. Testes passando
6. Infraestrutura pronta para implementar agregados

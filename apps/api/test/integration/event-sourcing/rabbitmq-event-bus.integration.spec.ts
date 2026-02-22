import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DomainEvent } from '../../../src/infrastructure/event-sourcing/domain/domain-event.interface';
import { IEventHandler } from '../../../src/infrastructure/event-sourcing/domain/event-handler.interface';
import { RabbitMQEventBus } from '../../../src/infrastructure/event-sourcing/event-bus/rabbitmq-event-bus.service';

describe('RabbitMQEventBus (Integration)', () => {
  let eventBus: RabbitMQEventBus;
  let receivedEvents: DomainEvent[];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: 'apps/api/.env',
        }),
      ],
      providers: [RabbitMQEventBus],
    }).compile();

    eventBus = module.get<RabbitMQEventBus>(RabbitMQEventBus);
    await eventBus.onModuleInit();
  });

  afterAll(async () => {
    await eventBus.onModuleDestroy();
  });

  beforeEach(() => {
    receivedEvents = [];
  });

  describe('publish and subscribe', () => {
    it('should publish and consume event', async () => {
      const eventType = 'TestEventPublished';

      const handler: IEventHandler = {
        handle: async (event: DomainEvent) => {
          receivedEvents.push(event);
        },
      };

      eventBus.subscribe(eventType, handler);

      const event: DomainEvent = {
        event_id: randomUUID(),
        event_type: eventType,
        aggregate_type: 'TestAggregate',
        aggregate_id: randomUUID(),
        aggregate_version: 1,
        tenant_id: randomUUID(),
        correlation_id: randomUUID(),
        created_at: new Date(),
        event_data: { test: 'data' },
      };

      await eventBus.publish(event);

      // Aguardar processamento assíncrono
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].event_type).toBe(eventType);
      expect(receivedEvents[0].event_data).toEqual({ test: 'data' });
    });

    it('should publish multiple events', async () => {
      const eventType = 'MultipleEvents';

      const handler: IEventHandler = {
        handle: async (event: DomainEvent) => {
          receivedEvents.push(event);
        },
      };

      eventBus.subscribe(eventType, handler);

      const events: DomainEvent[] = [
        {
          event_id: randomUUID(),
          event_type: eventType,
          aggregate_type: 'TestAggregate',
          aggregate_id: randomUUID(),
          aggregate_version: 1,
          tenant_id: randomUUID(),
          correlation_id: randomUUID(),
          created_at: new Date(),
          event_data: { index: 1 },
        },
        {
          event_id: randomUUID(),
          event_type: eventType,
          aggregate_type: 'TestAggregate',
          aggregate_id: randomUUID(),
          aggregate_version: 1,
          tenant_id: randomUUID(),
          correlation_id: randomUUID(),
          created_at: new Date(),
          event_data: { index: 2 },
        },
      ];

      await eventBus.publishMany(events);

      // Aguardar processamento assíncrono
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(receivedEvents).toHaveLength(2);
    });

    it('should handle multiple subscribers for same event type', async () => {
      const eventType = 'SharedEvent';
      const handler1Calls: DomainEvent[] = [];
      const handler2Calls: DomainEvent[] = [];

      const handler1: IEventHandler = {
        handle: async (event: DomainEvent) => {
          handler1Calls.push(event);
        },
      };

      const handler2: IEventHandler = {
        handle: async (event: DomainEvent) => {
          handler2Calls.push(event);
        },
      };

      eventBus.subscribe(eventType, handler1);
      eventBus.subscribe(eventType, handler2);

      const event: DomainEvent = {
        event_id: randomUUID(),
        event_type: eventType,
        aggregate_type: 'TestAggregate',
        aggregate_id: randomUUID(),
        aggregate_version: 1,
        tenant_id: randomUUID(),
        correlation_id: randomUUID(),
        created_at: new Date(),
        event_data: { test: 'shared' },
      };

      await eventBus.publish(event);

      // Aguardar processamento assíncrono
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(handler1Calls).toHaveLength(1);
      expect(handler2Calls).toHaveLength(1);
      expect(handler1Calls[0].event_id).toBe(event.event_id);
      expect(handler2Calls[0].event_id).toBe(event.event_id);
    });
  });

  describe('error handling', () => {
    it('should send failed events to DLQ', async () => {
      const eventType = 'FailingEvent';
      let attemptCount = 0;

      const failingHandler: IEventHandler = {
        handle: async () => {
          attemptCount++;
          throw new Error('Handler failed intentionally');
        },
      };

      eventBus.subscribe(eventType, failingHandler);

      const event: DomainEvent = {
        event_id: randomUUID(),
        event_type: eventType,
        aggregate_type: 'TestAggregate',
        aggregate_id: randomUUID(),
        aggregate_version: 1,
        tenant_id: randomUUID(),
        correlation_id: randomUUID(),
        created_at: new Date(),
        event_data: { will: 'fail' },
      };

      await eventBus.publish(event);

      // Aguardar processamento
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // O handler deve ter sido chamado pelo menos uma vez antes de ir para DLQ
      expect(attemptCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('correlation', () => {
    it('should preserve correlation_id across events', async () => {
      const correlationId = randomUUID();
      const eventType = 'CorrelatedEvent';

      const handler: IEventHandler = {
        handle: async (event: DomainEvent) => {
          receivedEvents.push(event);
        },
      };

      eventBus.subscribe(eventType, handler);

      const events: DomainEvent[] = [
        {
          event_id: randomUUID(),
          event_type: eventType,
          aggregate_type: 'Aggregate1',
          aggregate_id: randomUUID(),
          aggregate_version: 1,
          tenant_id: randomUUID(),
          correlation_id: correlationId,
          created_at: new Date(),
          event_data: { step: 1 },
        },
        {
          event_id: randomUUID(),
          event_type: eventType,
          aggregate_type: 'Aggregate2',
          aggregate_id: randomUUID(),
          aggregate_version: 1,
          tenant_id: randomUUID(),
          correlation_id: correlationId,
          created_at: new Date(),
          event_data: { step: 2 },
        },
      ];

      await eventBus.publishMany(events);

      // Aguardar processamento
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents.every((e) => e.correlation_id === correlationId)).toBe(
        true,
      );
    });
  });
});

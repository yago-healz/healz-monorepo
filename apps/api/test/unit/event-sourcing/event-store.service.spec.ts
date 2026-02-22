import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { db, events } from '../../../src/infrastructure/database';
import { DomainEvent } from '../../../src/infrastructure/event-sourcing/domain/domain-event.interface';
import { EventStoreService } from '../../../src/infrastructure/event-sourcing/event-store/event-store.service';
import { eq } from 'drizzle-orm';

describe('EventStoreService', () => {
  let service: EventStoreService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventStoreService],
    }).compile();

    service = module.get<EventStoreService>(EventStoreService);
  });

  afterEach(async () => {
    // Limpar eventos de teste
    await db.delete(events);
  });

  describe('append', () => {
    it('should append event to event store', async () => {
      const event: DomainEvent = {
        event_id: randomUUID(),
        event_type: 'TestEvent',
        aggregate_type: 'TestAggregate',
        aggregate_id: randomUUID(),
        aggregate_version: 1,
        tenant_id: randomUUID(),
        correlation_id: randomUUID(),
        created_at: new Date(),
        event_data: { test: 'data' },
      };

      await service.append(event);

      const result = await db
        .select()
        .from(events)
        .where(eq(events.eventId, event.event_id));

      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe('TestEvent');
      expect(result[0].aggregateType).toBe('TestAggregate');
    });
  });

  describe('appendMany', () => {
    it('should append multiple events in a transaction', async () => {
      const aggregateId = randomUUID();
      const correlationId = randomUUID();
      const tenantId = randomUUID();

      const eventsToSave: DomainEvent[] = [
        {
          event_id: randomUUID(),
          event_type: 'Event1',
          aggregate_type: 'TestAggregate',
          aggregate_id: aggregateId,
          aggregate_version: 1,
          tenant_id: tenantId,
          correlation_id: correlationId,
          created_at: new Date(),
          event_data: { step: 1 },
        },
        {
          event_id: randomUUID(),
          event_type: 'Event2',
          aggregate_type: 'TestAggregate',
          aggregate_id: aggregateId,
          aggregate_version: 2,
          tenant_id: tenantId,
          correlation_id: correlationId,
          created_at: new Date(),
          event_data: { step: 2 },
        },
      ];

      await service.appendMany(eventsToSave);

      const result = await db
        .select()
        .from(events)
        .where(eq(events.aggregateId, aggregateId));

      expect(result).toHaveLength(2);
    });

    it('should handle empty array', async () => {
      await expect(service.appendMany([])).resolves.not.toThrow();
    });
  });

  describe('getByAggregateId', () => {
    it('should get events by aggregate id ordered by version', async () => {
      const aggregateId = randomUUID();
      const tenantId = randomUUID();

      const eventsToSave: DomainEvent[] = [
        {
          event_id: randomUUID(),
          event_type: 'Event3',
          aggregate_type: 'TestAggregate',
          aggregate_id: aggregateId,
          aggregate_version: 3,
          tenant_id: tenantId,
          correlation_id: randomUUID(),
          created_at: new Date(),
          event_data: { order: 3 },
        },
        {
          event_id: randomUUID(),
          event_type: 'Event1',
          aggregate_type: 'TestAggregate',
          aggregate_id: aggregateId,
          aggregate_version: 1,
          tenant_id: tenantId,
          correlation_id: randomUUID(),
          created_at: new Date(),
          event_data: { order: 1 },
        },
        {
          event_id: randomUUID(),
          event_type: 'Event2',
          aggregate_type: 'TestAggregate',
          aggregate_id: aggregateId,
          aggregate_version: 2,
          tenant_id: tenantId,
          correlation_id: randomUUID(),
          created_at: new Date(),
          event_data: { order: 2 },
        },
      ];

      await service.appendMany(eventsToSave);

      const result = await service.getByAggregateId(
        'TestAggregate',
        aggregateId,
      );

      expect(result).toHaveLength(3);
      expect(result[0].aggregate_version).toBe(1);
      expect(result[1].aggregate_version).toBe(2);
      expect(result[2].aggregate_version).toBe(3);
    });
  });

  describe('getByCorrelationId', () => {
    it('should get all events with same correlation id', async () => {
      const correlationId = randomUUID();
      const tenantId = randomUUID();

      const eventsToSave: DomainEvent[] = [
        {
          event_id: randomUUID(),
          event_type: 'Event1',
          aggregate_type: 'Aggregate1',
          aggregate_id: randomUUID(),
          aggregate_version: 1,
          tenant_id: tenantId,
          correlation_id: correlationId,
          created_at: new Date(),
          event_data: {},
        },
        {
          event_id: randomUUID(),
          event_type: 'Event2',
          aggregate_type: 'Aggregate2',
          aggregate_id: randomUUID(),
          aggregate_version: 1,
          tenant_id: tenantId,
          correlation_id: correlationId,
          created_at: new Date(),
          event_data: {},
        },
      ];

      await service.appendMany(eventsToSave);

      const result = await service.getByCorrelationId(correlationId);

      expect(result).toHaveLength(2);
      expect(result.every((e) => e.correlation_id === correlationId)).toBe(
        true,
      );
    });
  });

  describe('optimistic locking', () => {
    it('should reject duplicate aggregate_version', async () => {
      const aggregateId = randomUUID();
      const tenantId = randomUUID();

      const event1: DomainEvent = {
        event_id: randomUUID(),
        event_type: 'Event1',
        aggregate_type: 'TestAggregate',
        aggregate_id: aggregateId,
        aggregate_version: 1,
        tenant_id: tenantId,
        correlation_id: randomUUID(),
        created_at: new Date(),
        event_data: {},
      };

      const event2: DomainEvent = {
        event_id: randomUUID(),
        event_type: 'Event2',
        aggregate_type: 'TestAggregate',
        aggregate_id: aggregateId,
        aggregate_version: 1, // Mesma versão!
        tenant_id: tenantId,
        correlation_id: randomUUID(),
        created_at: new Date(),
        event_data: {},
      };

      await service.append(event1);

      // Deve falhar por violação de unique constraint
      await expect(service.append(event2)).rejects.toThrow();
    });
  });

  describe('getByEventType', () => {
    it('should get events by type with pagination', async () => {
      const tenantId = randomUUID();

      const eventsToSave: DomainEvent[] = Array.from({ length: 5 }, (_, i) => ({
        event_id: randomUUID(),
        event_type: 'SpecificEvent',
        aggregate_type: 'TestAggregate',
        aggregate_id: randomUUID(),
        aggregate_version: 1,
        tenant_id: tenantId,
        correlation_id: randomUUID(),
        created_at: new Date(Date.now() + i * 1000),
        event_data: { index: i },
      }));

      await service.appendMany(eventsToSave);

      const result = await service.getByEventType('SpecificEvent', {
        limit: 3,
        offset: 1,
      });

      expect(result.length).toBeLessThanOrEqual(3);
      expect(result.every((e) => e.event_type === 'SpecificEvent')).toBe(true);
    });
  });

  describe('getByTenant', () => {
    it('should get events by tenant with pagination', async () => {
      const tenantId = randomUUID();

      const eventsToSave: DomainEvent[] = Array.from({ length: 3 }, (_, i) => ({
        event_id: randomUUID(),
        event_type: `Event${i}`,
        aggregate_type: 'TestAggregate',
        aggregate_id: randomUUID(),
        aggregate_version: 1,
        tenant_id: tenantId,
        correlation_id: randomUUID(),
        created_at: new Date(),
        event_data: { index: i },
      }));

      await service.appendMany(eventsToSave);

      const result = await service.getByTenant(tenantId);

      expect(result).toHaveLength(3);
      expect(result.every((e) => e.tenant_id === tenantId)).toBe(true);
    });
  });
});

import { DomainEvent } from "../domain/domain-event.interface";

export interface IEventStore {
  append(event: DomainEvent): Promise<void>;
  appendMany(events: DomainEvent[]): Promise<void>;
  getByAggregateId(
    aggregateType: string,
    aggregateId: string,
  ): Promise<DomainEvent[]>;
  getByCorrelationId(correlationId: string): Promise<DomainEvent[]>;
  getByEventType(
    eventType: string,
    options?: { limit?: number; offset?: number },
  ): Promise<DomainEvent[]>;
  getByTenant(
    tenantId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<DomainEvent[]>;
}

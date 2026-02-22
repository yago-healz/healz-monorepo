import { Injectable } from "@nestjs/common";
import { eq, and, asc, desc } from "drizzle-orm";
import { db, events } from "../../database";
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

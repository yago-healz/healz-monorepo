import { DomainEvent } from "../domain/domain-event.interface";
import { IEventHandler } from "../domain/event-handler.interface";

export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
  subscribe(eventType: string, handler: IEventHandler): void;
}

import { DomainEvent } from "./domain-event.interface";

export interface IEventHandler {
  handle(event: DomainEvent): Promise<void>;
}

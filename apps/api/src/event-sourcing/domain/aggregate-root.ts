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

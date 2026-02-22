import { Inject, Injectable } from "@nestjs/common";
import { IEventBus } from "../../../infrastructure/event-sourcing/event-bus/event-bus.interface";
import { IEventStore } from "../../../infrastructure/event-sourcing/event-store/event-store.interface";
import { PatientJourney } from "../domain/patient-journey.aggregate";

@Injectable()
export class PatientJourneyService {
  constructor(
    @Inject("IEventStore") private readonly eventStore: IEventStore,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
  ) {}

  private async loadAggregate(id: string): Promise<PatientJourney> {
    const events = await this.eventStore.getByAggregateId("PatientJourney", id);
    if (events.length === 0) {
      throw new Error("Journey not found");
    }
    const journey = new (PatientJourney as any)();
    journey.loadFromHistory(events);
    return journey;
  }

  private async saveAndPublish(journey: PatientJourney): Promise<void> {
    const events = journey.getUncommittedEvents();
    await this.eventStore.appendMany(events);
    await this.eventBus.publishMany(events);
  }
}

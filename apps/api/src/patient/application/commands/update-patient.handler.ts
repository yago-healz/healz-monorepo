import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { IEventStore } from "../../../event-sourcing/event-store/event-store.interface";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { Patient } from "../../domain/patient.aggregate";
import { CorrelationUtil } from "../../../event-sourcing/utils/correlation.util";

@Injectable()
export class UpdatePatientHandler {
  constructor(
    @Inject("IEventStore") private readonly eventStore: IEventStore,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
  ) {}

  async execute(command: {
    patientId: string;
    fullName?: string;
    email?: string;
    birthDate?: string;
    userId?: string;
  }): Promise<void> {
    // Reconstruct patient from event history
    const events = await this.eventStore.getEvents(command.patientId, "Patient");

    if (events.length === 0) {
      throw new NotFoundException(`Patient ${command.patientId} not found`);
    }

    const patient = new (Patient as any)();
    patient.loadFromHistory(events);

    // Execute update command
    patient.update({
      fullName: command.fullName,
      email: command.email,
      birthDate: command.birthDate,
      correlationId: CorrelationUtil.generate("update-patient"),
      userId: command.userId,
    });

    // Persist and publish new events
    const newEvents = patient.getUncommittedEvents();
    await this.eventStore.appendMany(newEvents);
    await this.eventBus.publishMany(newEvents);
  }
}

import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import { IEventStore } from "../../../event-sourcing/event-store/event-store.interface";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { Patient } from "../../domain/patient.aggregate";
import { CorrelationUtil } from "../../../event-sourcing/utils/correlation.util";

@Injectable()
export class RegisterPatientHandler {
  constructor(
    @Inject("IEventStore") private readonly eventStore: IEventStore,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
  ) {}

  async execute(command: {
    tenantId: string;
    clinicId: string;
    phone: string;
    fullName?: string;
    email?: string;
    birthDate?: string;
    userId?: string;
  }): Promise<string> {
    const patient = Patient.register({
      patientId: randomUUID(),
      tenantId: command.tenantId,
      clinicId: command.clinicId,
      phone: command.phone,
      fullName: command.fullName,
      email: command.email,
      birthDate: command.birthDate,
      correlationId: CorrelationUtil.generate("register-patient"),
      userId: command.userId,
    });

    const events = patient.getUncommittedEvents();
    await this.eventStore.appendMany(events);
    await this.eventBus.publishMany(events);

    return patient.getId();
  }
}

import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db, patientView } from "../../../db";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";
import { IEventHandler } from "../../../event-sourcing/domain/event-handler.interface";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { PatientRegisteredData } from "../../domain/events/patient-registered.event";
import { PatientUpdatedData } from "../../domain/events/patient-updated.event";

@Injectable()
export class PatientProjectionHandler implements IEventHandler, OnModuleInit {
  constructor(@Inject("IEventBus") private readonly eventBus: IEventBus) {}

  onModuleInit() {
    this.eventBus.subscribe("PatientRegistered", this);
    this.eventBus.subscribe("PatientUpdated", this);
  }

  async handle(event: DomainEvent): Promise<void> {
    switch (event.event_type) {
      case "PatientRegistered":
        await this.onPatientRegistered(event.event_data as PatientRegisteredData, event.created_at);
        break;
      case "PatientUpdated":
        await this.onPatientUpdated(event.event_data as PatientUpdatedData, event.created_at);
        break;
    }
  }

  private async onPatientRegistered(data: PatientRegisteredData, createdAt: Date): Promise<void> {
    await db.insert(patientView).values({
      id: data.patient_id,
      tenantId: data.tenant_id,
      clinicId: data.clinic_id,
      phone: data.phone,
      fullName: data.full_name,
      email: data.email,
      birthDate: data.birth_date,
      status: "active",
      metadata: {},
      createdAt,
      updatedAt: createdAt,
    });
  }

  private async onPatientUpdated(data: PatientUpdatedData, createdAt: Date): Promise<void> {
    const updates: Record<string, any> = { updatedAt: createdAt };
    if (data.updates.full_name !== undefined) updates.fullName = data.updates.full_name;
    if (data.updates.email !== undefined) updates.email = data.updates.email;
    if (data.updates.birth_date !== undefined) updates.birthDate = data.updates.birth_date;

    await db.update(patientView).set(updates).where(eq(patientView.id, data.patient_id));
  }
}

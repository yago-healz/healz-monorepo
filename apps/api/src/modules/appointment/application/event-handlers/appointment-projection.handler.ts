import { Injectable, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../../../infrastructure/database";
import { appointmentView } from "../../../../infrastructure/database/schema/appointment-view.schema";
import { IEventBus } from "../../../../infrastructure/event-sourcing/event-bus/event-bus.interface";
import { DomainEvent } from "../../../../infrastructure/event-sourcing/domain/domain-event.interface";

@Injectable()
export class AppointmentProjectionHandler implements OnModuleInit {
  private readonly logger = new Logger(AppointmentProjectionHandler.name);

  constructor(@Inject("IEventBus") private readonly eventBus: IEventBus) {}

  onModuleInit() {
    this.eventBus.subscribe("AppointmentScheduled", {
      handle: (event) => this.onScheduled(event),
    });
    this.eventBus.subscribe("AppointmentConfirmed", {
      handle: (event) => this.onConfirmed(event),
    });
    this.eventBus.subscribe("AppointmentCancelled", {
      handle: (event) => this.onCancelled(event),
    });
    this.eventBus.subscribe("AppointmentRescheduled", {
      handle: (event) => this.onRescheduled(event),
    });
    this.eventBus.subscribe("AppointmentCompleted", {
      handle: (event) => this.onCompleted(event),
    });
    this.eventBus.subscribe("AppointmentNoShow", {
      handle: (event) => this.onNoShow(event),
    });
  }

  async handle(event: DomainEvent): Promise<void> {
    switch (event.event_type) {
      case "AppointmentScheduled":
        return this.onScheduled(event);
      case "AppointmentConfirmed":
        return this.onConfirmed(event);
      case "AppointmentCancelled":
        return this.onCancelled(event);
      case "AppointmentRescheduled":
        return this.onRescheduled(event);
      case "AppointmentCompleted":
        return this.onCompleted(event);
      case "AppointmentNoShow":
        return this.onNoShow(event);
    }
  }

  private async onScheduled(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db
      .insert(appointmentView)
      .values({
        id: data.appointment_id,
        patientId: data.patient_id,
        tenantId: data.tenant_id,
        clinicId: data.clinic_id,
        doctorId: data.doctor_id,
        scheduledAt: new Date(data.scheduled_at),
        duration: data.duration,
        status: "scheduled",
        reason: data.reason,
        notes: data.notes,
        createdAt: event.created_at,
        updatedAt: event.created_at,
      })
      .onConflictDoNothing();
  }

  private async onConfirmed(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db
      .update(appointmentView)
      .set({
        status: "confirmed",
        confirmedAt: new Date(data.confirmed_at),
        updatedAt: new Date(),
      })
      .where(eq(appointmentView.id, data.appointment_id));
  }

  private async onCancelled(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db
      .update(appointmentView)
      .set({
        status: "cancelled",
        cancelledAt: new Date(data.cancelled_at),
        updatedAt: new Date(),
      })
      .where(eq(appointmentView.id, data.appointment_id));
  }

  private async onRescheduled(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db
      .update(appointmentView)
      .set({
        scheduledAt: new Date(data.new_scheduled_at),
        updatedAt: new Date(),
      })
      .where(eq(appointmentView.id, data.appointment_id));
  }

  private async onCompleted(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db
      .update(appointmentView)
      .set({
        status: "completed",
        completedAt: new Date(data.completed_at),
        notes: data.notes || undefined,
        updatedAt: new Date(),
      })
      .where(eq(appointmentView.id, data.appointment_id));
  }

  private async onNoShow(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db
      .update(appointmentView)
      .set({
        status: "no_show",
        updatedAt: new Date(),
      })
      .where(eq(appointmentView.id, data.appointment_id));
  }
}

import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import { eq, and, gte, lte, inArray, ne } from "drizzle-orm";
import { db } from "../../db";
import { appointmentView } from "../../db/schema/appointment-view.schema";
import { IEventStore } from "../../event-sourcing/event-store/event-store.interface";
import { IEventBus } from "../../event-sourcing/event-bus/event-bus.interface";
import { Appointment } from "../domain/appointment.aggregate";
import { CorrelationUtil } from "../../event-sourcing/utils/correlation.util";

@Injectable()
export class AppointmentService {
  constructor(
    @Inject("IEventStore") private readonly eventStore: IEventStore,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
  ) {}

  async schedule(params: {
    patientId: string;
    tenantId: string;
    clinicId: string;
    doctorId: string;
    scheduledAt: Date;
    duration: number;
    reason?: string;
    notes?: string;
    correlationId?: string;
    userId?: string;
  }): Promise<string> {
    // Verificar conflitos de horario
    const conflicts = await this.checkTimeConflicts(
      params.doctorId,
      params.scheduledAt,
      params.duration,
    );
    if (conflicts.length > 0) {
      throw new Error("Time slot not available");
    }

    const appointmentId = randomUUID();
    const correlationId =
      params.correlationId ||
      CorrelationUtil.generate("schedule-appointment");

    const appointment = Appointment.schedule({
      appointmentId,
      patientId: params.patientId,
      tenantId: params.tenantId,
      clinicId: params.clinicId,
      doctorId: params.doctorId,
      scheduledAt: params.scheduledAt,
      duration: params.duration,
      reason: params.reason,
      notes: params.notes,
      correlationId,
      userId: params.userId,
    });

    const events = appointment.getUncommittedEvents();
    await this.eventStore.appendMany(events);
    await this.eventBus.publishMany(events);

    return appointmentId;
  }

  async confirm(
    id: string,
    confirmedBy: string,
    correlationId?: string,
  ): Promise<void> {
    const appointment = await this.loadAggregate(id);
    appointment.confirm({
      confirmedBy,
      correlationId:
        correlationId || CorrelationUtil.generate("confirm-appointment"),
    });
    await this.saveAndPublish(appointment);
  }

  async cancel(
    id: string,
    cancelledBy: string,
    reason?: string,
    correlationId?: string,
  ): Promise<void> {
    const appointment = await this.loadAggregate(id);
    appointment.cancel({
      cancelledBy,
      reason,
      correlationId:
        correlationId || CorrelationUtil.generate("cancel-appointment"),
    });
    await this.saveAndPublish(appointment);
  }

  async reschedule(
    id: string,
    newScheduledAt: Date,
    rescheduledBy: string,
    reason?: string,
    correlationId?: string,
  ): Promise<void> {
    const appointment = await this.loadAggregate(id);

    // Verificar conflitos no novo horario
    const conflicts = await this.checkTimeConflicts(
      appointment.getDoctorId(),
      newScheduledAt,
      appointment.getDuration(),
      id,
    );
    if (conflicts.length > 0) {
      throw new Error("New time slot not available");
    }

    appointment.reschedule({
      newScheduledAt,
      rescheduledBy,
      reason,
      correlationId:
        correlationId || CorrelationUtil.generate("reschedule-appointment"),
    });
    await this.saveAndPublish(appointment);
  }

  async complete(
    id: string,
    notes?: string,
    correlationId?: string,
  ): Promise<void> {
    const appointment = await this.loadAggregate(id);
    appointment.complete({
      notes,
      correlationId:
        correlationId || CorrelationUtil.generate("complete-appointment"),
    });
    await this.saveAndPublish(appointment);
  }

  async markNoShow(id: string, correlationId?: string): Promise<void> {
    const appointment = await this.loadAggregate(id);
    appointment.markNoShow({
      correlationId:
        correlationId || CorrelationUtil.generate("no-show-appointment"),
    });
    await this.saveAndPublish(appointment);
  }

  // Helpers

  private async loadAggregate(id: string): Promise<Appointment> {
    const events = await this.eventStore.getByAggregateId("Appointment", id);
    if (events.length === 0) {
      throw new Error("Appointment not found");
    }
    const appointment = new (Appointment as any)();
    appointment.loadFromHistory(events);
    return appointment;
  }

  private async saveAndPublish(appointment: Appointment): Promise<void> {
    const events = appointment.getUncommittedEvents();
    await this.eventStore.appendMany(events);
    await this.eventBus.publishMany(events);
  }

  private async checkTimeConflicts(
    doctorId: string,
    scheduledAt: Date,
    duration: number,
    excludeId?: string,
  ): Promise<any[]> {
    const endTime = new Date(scheduledAt.getTime() + duration * 60000);

    const conditions = [
      eq(appointmentView.doctorId, doctorId),
      inArray(appointmentView.status, ["scheduled", "confirmed"]),
      lte(appointmentView.scheduledAt, endTime),
      // Simplificacao: verifica overlap basico
      gte(
        appointmentView.scheduledAt,
        new Date(scheduledAt.getTime() - duration * 60000),
      ),
    ];

    if (excludeId) {
      conditions.push(ne(appointmentView.id, excludeId));
    }

    const conflicts = await db
      .select({ id: appointmentView.id })
      .from(appointmentView)
      .where(and(...conditions));

    return conflicts;
  }
}

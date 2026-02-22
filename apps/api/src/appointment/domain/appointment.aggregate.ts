import { AggregateRoot } from "../../infrastructure/event-sourcing/domain/aggregate-root";
import { DomainEvent } from "../../infrastructure/event-sourcing/domain/domain-event.interface";
import {
  createAppointmentScheduledEvent,
  AppointmentScheduledData,
} from "./events/appointment-scheduled.event";
import {
  createAppointmentConfirmedEvent,
  AppointmentConfirmedData,
} from "./events/appointment-confirmed.event";
import {
  createAppointmentCancelledEvent,
  AppointmentCancelledData,
} from "./events/appointment-cancelled.event";
import {
  createAppointmentRescheduledEvent,
  AppointmentRescheduledData,
} from "./events/appointment-rescheduled.event";
import {
  createAppointmentCompletedEvent,
  AppointmentCompletedData,
} from "./events/appointment-completed.event";
import {
  createAppointmentNoShowEvent,
  AppointmentNoShowData,
} from "./events/appointment-no-show.event";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export class Appointment extends AggregateRoot {
  private patientId: string;
  private tenantId: string;
  private clinicId: string;
  private doctorId: string;
  private scheduledAt: Date;
  private duration: number;
  private status: AppointmentStatus;
  private reason?: string;
  private notes?: string;

  private constructor() {
    super();
  }

  static schedule(params: {
    appointmentId: string;
    patientId: string;
    tenantId: string;
    clinicId: string;
    doctorId: string;
    scheduledAt: Date;
    duration: number;
    reason?: string;
    notes?: string;
    correlationId: string;
    userId?: string;
  }): Appointment {
    const appointment = new Appointment();

    if (params.scheduledAt <= new Date()) {
      throw new Error("Appointment must be scheduled in the future");
    }

    if (params.duration <= 0 || params.duration > 480) {
      throw new Error("Duration must be between 1 and 480 minutes");
    }

    const event = createAppointmentScheduledEvent({
      aggregateId: params.appointmentId,
      aggregateVersion: 1,
      tenantId: params.tenantId,
      clinicId: params.clinicId,
      correlationId: params.correlationId,
      userId: params.userId,
      data: {
        appointment_id: params.appointmentId,
        patient_id: params.patientId,
        clinic_id: params.clinicId,
        tenant_id: params.tenantId,
        doctor_id: params.doctorId,
        scheduled_at: params.scheduledAt.toISOString(),
        duration: params.duration,
        reason: params.reason,
        notes: params.notes,
      },
    });

    appointment.addEvent(event);
    return appointment;
  }

  confirm(params: { confirmedBy: string; correlationId: string }): void {
    if (this.status !== "scheduled") {
      throw new Error("Only scheduled appointments can be confirmed");
    }

    const event = createAppointmentConfirmedEvent({
      aggregateId: this.id,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      data: {
        appointment_id: this.id,
        confirmed_at: new Date().toISOString(),
        confirmed_by: params.confirmedBy,
      },
    });

    this.addEvent(event);
  }

  cancel(params: {
    cancelledBy: string;
    reason?: string;
    correlationId: string;
  }): void {
    if (this.status === "completed") {
      throw new Error("Cannot cancel completed appointment");
    }
    if (this.status === "cancelled") {
      throw new Error("Appointment is already cancelled");
    }

    const event = createAppointmentCancelledEvent({
      aggregateId: this.id,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      data: {
        appointment_id: this.id,
        cancelled_at: new Date().toISOString(),
        cancelled_by: params.cancelledBy,
        reason: params.reason,
      },
    });

    this.addEvent(event);
  }

  reschedule(params: {
    newScheduledAt: Date;
    rescheduledBy: string;
    reason?: string;
    correlationId: string;
  }): void {
    if (this.status !== "scheduled" && this.status !== "confirmed") {
      throw new Error(
        "Only scheduled or confirmed appointments can be rescheduled",
      );
    }
    if (params.newScheduledAt <= new Date()) {
      throw new Error("New appointment time must be in the future");
    }

    const event = createAppointmentRescheduledEvent({
      aggregateId: this.id,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      data: {
        appointment_id: this.id,
        previous_scheduled_at: this.scheduledAt.toISOString(),
        new_scheduled_at: params.newScheduledAt.toISOString(),
        rescheduled_at: new Date().toISOString(),
        rescheduled_by: params.rescheduledBy,
        reason: params.reason,
      },
    });

    this.addEvent(event);
  }

  complete(params: { notes?: string; correlationId: string }): void {
    if (this.status !== "scheduled" && this.status !== "confirmed") {
      throw new Error(
        "Only scheduled or confirmed appointments can be completed",
      );
    }

    const event = createAppointmentCompletedEvent({
      aggregateId: this.id,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      data: {
        appointment_id: this.id,
        completed_at: new Date().toISOString(),
        notes: params.notes,
      },
    });

    this.addEvent(event);
  }

  markNoShow(params: { correlationId: string }): void {
    if (this.status !== "scheduled" && this.status !== "confirmed") {
      throw new Error(
        "Only scheduled or confirmed appointments can be marked as no-show",
      );
    }

    const event = createAppointmentNoShowEvent({
      aggregateId: this.id,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      data: {
        appointment_id: this.id,
        missed_at: new Date().toISOString(),
      },
    });

    this.addEvent(event);
  }

  protected applyEvent(event: DomainEvent): void {
    switch (event.event_type) {
      case "AppointmentScheduled":
        this.applyScheduled(event.event_data as AppointmentScheduledData);
        break;
      case "AppointmentConfirmed":
        this.applyConfirmed(event.event_data as AppointmentConfirmedData);
        break;
      case "AppointmentCancelled":
        this.applyCancelled();
        break;
      case "AppointmentRescheduled":
        this.applyRescheduled(event.event_data as AppointmentRescheduledData);
        break;
      case "AppointmentCompleted":
        this.applyCompleted();
        break;
      case "AppointmentNoShow":
        this.applyNoShow();
        break;
    }
  }

  private applyScheduled(data: AppointmentScheduledData): void {
    this.id = data.appointment_id;
    this.patientId = data.patient_id;
    this.tenantId = data.tenant_id;
    this.clinicId = data.clinic_id;
    this.doctorId = data.doctor_id;
    this.scheduledAt = new Date(data.scheduled_at);
    this.duration = data.duration;
    this.reason = data.reason;
    this.notes = data.notes;
    this.status = "scheduled";
  }

  private applyConfirmed(data: AppointmentConfirmedData): void {
    this.status = "confirmed";
  }

  private applyCancelled(): void {
    this.status = "cancelled";
  }

  private applyRescheduled(data: AppointmentRescheduledData): void {
    this.scheduledAt = new Date(data.new_scheduled_at);
  }

  private applyCompleted(): void {
    this.status = "completed";
  }

  private applyNoShow(): void {
    this.status = "no_show";
  }

  // Getters
  getStatus(): AppointmentStatus {
    return this.status;
  }
  getScheduledAt(): Date {
    return this.scheduledAt;
  }
  getPatientId(): string {
    return this.patientId;
  }
  getTenantId(): string {
    return this.tenantId;
  }
  getClinicId(): string {
    return this.clinicId;
  }
  getDoctorId(): string {
    return this.doctorId;
  }
  getDuration(): number {
    return this.duration;
  }
}

# Fase 6: Appointment Aggregate

## Objetivo

Implementar o agregado de agendamentos (Appointment) que gerencia todo o ciclo de vida de consultas: criacao, confirmacao, cancelamento e reagendamento.

## Pre-requisitos

- Fase 1 concluida (Event Store Foundation)
- Fase 2 concluida (Patient Aggregate)
- Fase 4 concluida (Conversation Aggregate)

## Escopo

### O que sera implementado

1. **Agregado Appointment** - Gerenciamento de consultas
2. **Eventos de dominio** - AppointmentScheduled, Confirmed, Cancelled, Rescheduled, Completed, NoShow
3. **Projection appointment_view** - Read model via Drizzle
4. **Regras de negocio** - Validacoes de horario, conflitos, etc.
5. **API REST temporaria** - Endpoints para testes

### O que NAO sera implementado

- Integracao com calendario externo
- Notificacoes por email/SMS
- Recorrencia de consultas
- Lista de espera

## Estrutura de Arquivos

```
apps/api/src/
+-- db/schema/
|   +-- appointment-view.schema.ts   # NOVO - Projection table
|   +-- index.ts                     # Atualizar com export
+-- appointment/
|   +-- appointment.module.ts
|   +-- domain/
|   |   +-- appointment.aggregate.ts
|   |   +-- events/
|   |       +-- appointment-scheduled.event.ts
|   |       +-- appointment-confirmed.event.ts
|   |       +-- appointment-cancelled.event.ts
|   |       +-- appointment-rescheduled.event.ts
|   |       +-- appointment-completed.event.ts
|   |       +-- appointment-no-show.event.ts
|   +-- application/
|   |   +-- appointment.service.ts
|   |   +-- event-handlers/
|   |       +-- appointment-projection.handler.ts
|   +-- api/
|       +-- appointment.controller.ts
|       +-- dtos/
|           +-- appointment.dto.ts
```

## Projection Schema (Drizzle)

```typescript
// src/db/schema/appointment-view.schema.ts

import {
  pgTable, uuid, varchar, integer, text,
  timestamp, index,
} from "drizzle-orm/pg-core";

export const appointmentView = pgTable("appointment_view", {
  id: uuid("id").primaryKey(),
  patientId: uuid("patient_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  clinicId: uuid("clinic_id").notNull(),
  doctorId: uuid("doctor_id").notNull(),

  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  duration: integer("duration").notNull(), // minutos
  status: varchar("status", { length: 20 }).notNull().default("scheduled"),

  reason: text("reason"),
  notes: text("notes"),

  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("idx_appointment_patient").on(table.patientId),
  index("idx_appointment_clinic").on(table.clinicId),
  index("idx_appointment_doctor").on(table.doctorId),
  index("idx_appointment_scheduled_at").on(table.scheduledAt),
  index("idx_appointment_status").on(table.status),
  // Indice composto para buscar conflitos de horario
  index("idx_appointment_doctor_time").on(table.doctorId, table.scheduledAt),
]);
```

**Nota:** Adicionar `export * from "./appointment-view.schema"` no `src/db/schema/index.ts` e rodar migration.

## Eventos

Todos seguem o padrao factory function retornando `DomainEvent<T>`.

```typescript
// domain/events/appointment-scheduled.event.ts

import { randomUUID } from "crypto";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";

export interface AppointmentScheduledData {
  appointment_id: string;
  patient_id: string;
  clinic_id: string;
  tenant_id: string;
  doctor_id: string;
  scheduled_at: string; // ISO 8601
  duration: number;
  reason?: string;
  notes?: string;
}

export function createAppointmentScheduledEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  data: AppointmentScheduledData;
}): DomainEvent<AppointmentScheduledData> {
  return {
    event_id: randomUUID(),
    event_type: "AppointmentScheduled",
    aggregate_type: "Appointment",
    aggregate_id: params.aggregateId,
    aggregate_version: params.aggregateVersion,
    tenant_id: params.tenantId,
    clinic_id: params.clinicId,
    correlation_id: params.correlationId,
    causation_id: params.causationId,
    user_id: params.userId,
    created_at: new Date(),
    event_data: params.data,
  };
}
```

```typescript
// domain/events/appointment-confirmed.event.ts

export interface AppointmentConfirmedData {
  appointment_id: string;
  confirmed_at: string;
  confirmed_by: string;
}

// Mesmo padrao factory function - createAppointmentConfirmedEvent(...)
```

```typescript
// domain/events/appointment-cancelled.event.ts

export interface AppointmentCancelledData {
  appointment_id: string;
  cancelled_at: string;
  cancelled_by: string;
  reason?: string;
}

// Mesmo padrao factory function - createAppointmentCancelledEvent(...)
```

```typescript
// domain/events/appointment-rescheduled.event.ts

export interface AppointmentRescheduledData {
  appointment_id: string;
  previous_scheduled_at: string;
  new_scheduled_at: string;
  rescheduled_at: string;
  rescheduled_by: string;
  reason?: string;
}

// Mesmo padrao factory function - createAppointmentRescheduledEvent(...)
```

```typescript
// domain/events/appointment-completed.event.ts

export interface AppointmentCompletedData {
  appointment_id: string;
  completed_at: string;
  notes?: string;
}

// Mesmo padrao factory function - createAppointmentCompletedEvent(...)
```

```typescript
// domain/events/appointment-no-show.event.ts

export interface AppointmentNoShowData {
  appointment_id: string;
  missed_at: string;
}

// Mesmo padrao factory function - createAppointmentNoShowEvent(...)
```

## Agregado Appointment

```typescript
// domain/appointment.aggregate.ts

import { AggregateRoot } from "../../event-sourcing/domain/aggregate-root";
import { DomainEvent } from "../../event-sourcing/domain/domain-event.interface";
import { createAppointmentScheduledEvent, AppointmentScheduledData } from "./events/appointment-scheduled.event";
import { createAppointmentConfirmedEvent, AppointmentConfirmedData } from "./events/appointment-confirmed.event";
import { createAppointmentCancelledEvent, AppointmentCancelledData } from "./events/appointment-cancelled.event";
import { createAppointmentRescheduledEvent, AppointmentRescheduledData } from "./events/appointment-rescheduled.event";
import { createAppointmentCompletedEvent, AppointmentCompletedData } from "./events/appointment-completed.event";
import { createAppointmentNoShowEvent, AppointmentNoShowData } from "./events/appointment-no-show.event";

export type AppointmentStatus = "scheduled" | "confirmed" | "cancelled" | "completed" | "no_show";

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

  confirm(params: {
    confirmedBy: string;
    correlationId: string;
  }): void {
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
      throw new Error("Only scheduled or confirmed appointments can be rescheduled");
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

  complete(params: {
    notes?: string;
    correlationId: string;
  }): void {
    if (this.status !== "scheduled" && this.status !== "confirmed") {
      throw new Error("Only scheduled or confirmed appointments can be completed");
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
      throw new Error("Only scheduled or confirmed appointments can be marked as no-show");
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
  getStatus(): AppointmentStatus { return this.status; }
  getScheduledAt(): Date { return this.scheduledAt; }
  getPatientId(): string { return this.patientId; }
  getTenantId(): string { return this.tenantId; }
  getClinicId(): string { return this.clinicId; }
  getDoctorId(): string { return this.doctorId; }
  getDuration(): number { return this.duration; }
}
```

## Projection Handler

```typescript
// application/event-handlers/appointment-projection.handler.ts

import { Injectable, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { appointmentView } from "../../../db/schema/appointment-view.schema";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";

@Injectable()
export class AppointmentProjectionHandler implements OnModuleInit {
  private readonly logger = new Logger(AppointmentProjectionHandler.name);

  constructor(@Inject("IEventBus") private readonly eventBus: IEventBus) {}

  onModuleInit() {
    this.eventBus.subscribe("AppointmentScheduled", (e) => this.onScheduled(e));
    this.eventBus.subscribe("AppointmentConfirmed", (e) => this.onConfirmed(e));
    this.eventBus.subscribe("AppointmentCancelled", (e) => this.onCancelled(e));
    this.eventBus.subscribe("AppointmentRescheduled", (e) => this.onRescheduled(e));
    this.eventBus.subscribe("AppointmentCompleted", (e) => this.onCompleted(e));
    this.eventBus.subscribe("AppointmentNoShow", (e) => this.onNoShow(e));
  }

  private async onScheduled(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db.insert(appointmentView).values({
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
    });
  }

  private async onConfirmed(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db.update(appointmentView)
      .set({
        status: "confirmed",
        confirmedAt: new Date(data.confirmed_at),
        updatedAt: new Date(),
      })
      .where(eq(appointmentView.id, data.appointment_id));
  }

  private async onCancelled(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db.update(appointmentView)
      .set({
        status: "cancelled",
        cancelledAt: new Date(data.cancelled_at),
        updatedAt: new Date(),
      })
      .where(eq(appointmentView.id, data.appointment_id));
  }

  private async onRescheduled(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db.update(appointmentView)
      .set({
        scheduledAt: new Date(data.new_scheduled_at),
        updatedAt: new Date(),
      })
      .where(eq(appointmentView.id, data.appointment_id));
  }

  private async onCompleted(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    await db.update(appointmentView)
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
    await db.update(appointmentView)
      .set({
        status: "no_show",
        updatedAt: new Date(),
      })
      .where(eq(appointmentView.id, data.appointment_id));
  }
}
```

## Application Service

```typescript
// application/appointment.service.ts

import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import { eq, and, gte, lte, inArray, ne } from "drizzle-orm";
import { db } from "../../../db";
import { appointmentView } from "../../../db/schema/appointment-view.schema";
import { IEventStore } from "../../../event-sourcing/event-store/event-store.interface";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { Appointment } from "../domain/appointment.aggregate";
import { CorrelationUtil } from "../../../event-sourcing/utils/correlation.util";

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
      params.doctorId, params.scheduledAt, params.duration,
    );
    if (conflicts.length > 0) {
      throw new Error("Time slot not available");
    }

    const appointmentId = randomUUID();
    const correlationId = params.correlationId || CorrelationUtil.generate("schedule-appointment");

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

  async confirm(id: string, confirmedBy: string, correlationId?: string): Promise<void> {
    const appointment = await this.loadAggregate(id);
    appointment.confirm({
      confirmedBy,
      correlationId: correlationId || CorrelationUtil.generate("confirm-appointment"),
    });
    await this.saveAndPublish(appointment);
  }

  async cancel(id: string, cancelledBy: string, reason?: string, correlationId?: string): Promise<void> {
    const appointment = await this.loadAggregate(id);
    appointment.cancel({
      cancelledBy,
      reason,
      correlationId: correlationId || CorrelationUtil.generate("cancel-appointment"),
    });
    await this.saveAndPublish(appointment);
  }

  async reschedule(id: string, newScheduledAt: Date, rescheduledBy: string, reason?: string, correlationId?: string): Promise<void> {
    const appointment = await this.loadAggregate(id);

    // Verificar conflitos no novo horario
    const conflicts = await this.checkTimeConflicts(
      appointment.getDoctorId(), newScheduledAt, appointment.getDuration(), id,
    );
    if (conflicts.length > 0) {
      throw new Error("New time slot not available");
    }

    appointment.reschedule({
      newScheduledAt,
      rescheduledBy,
      reason,
      correlationId: correlationId || CorrelationUtil.generate("reschedule-appointment"),
    });
    await this.saveAndPublish(appointment);
  }

  async complete(id: string, notes?: string, correlationId?: string): Promise<void> {
    const appointment = await this.loadAggregate(id);
    appointment.complete({
      notes,
      correlationId: correlationId || CorrelationUtil.generate("complete-appointment"),
    });
    await this.saveAndPublish(appointment);
  }

  async markNoShow(id: string, correlationId?: string): Promise<void> {
    const appointment = await this.loadAggregate(id);
    appointment.markNoShow({
      correlationId: correlationId || CorrelationUtil.generate("no-show-appointment"),
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
      gte(appointmentView.scheduledAt, new Date(scheduledAt.getTime() - duration * 60000)),
    ];

    if (excludeId) {
      conditions.push(ne(appointmentView.id, excludeId));
    }

    const conflicts = await db.select({ id: appointmentView.id })
      .from(appointmentView)
      .where(and(...conditions));

    return conflicts;
  }
}
```

## API REST (Temporaria)

```typescript
// api/appointment.controller.ts

import { Controller, Get, Post, Patch, Body, Param, Query, NotFoundException } from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../../db";
import { appointmentView } from "../../../db/schema/appointment-view.schema";
import { AppointmentService } from "../application/appointment.service";

@Controller("appointments")
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  async create(@Body() dto: ScheduleAppointmentDto) {
    const id = await this.appointmentService.schedule({
      patientId: dto.patientId,
      tenantId: dto.tenantId,
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      scheduledAt: new Date(dto.scheduledAt),
      duration: dto.duration,
      reason: dto.reason,
      notes: dto.notes,
    });
    return { id };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const [result] = await db.select()
      .from(appointmentView)
      .where(eq(appointmentView.id, id));

    if (!result) throw new NotFoundException("Appointment not found");
    return result;
  }

  @Get()
  async findAll(
    @Query("patientId") patientId?: string,
    @Query("clinicId") clinicId?: string,
    @Query("doctorId") doctorId?: string,
    @Query("status") status?: string,
  ) {
    const conditions = [];
    if (patientId) conditions.push(eq(appointmentView.patientId, patientId));
    if (clinicId) conditions.push(eq(appointmentView.clinicId, clinicId));
    if (doctorId) conditions.push(eq(appointmentView.doctorId, doctorId));
    if (status) conditions.push(eq(appointmentView.status, status));

    return db.select()
      .from(appointmentView)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(appointmentView.scheduledAt));
  }

  @Patch(":id/confirm")
  async confirm(@Param("id") id: string, @Body() dto: ConfirmAppointmentDto) {
    await this.appointmentService.confirm(id, dto.confirmedBy);
    return { message: "Appointment confirmed" };
  }

  @Patch(":id/cancel")
  async cancel(@Param("id") id: string, @Body() dto: CancelAppointmentDto) {
    await this.appointmentService.cancel(id, dto.cancelledBy, dto.reason);
    return { message: "Appointment cancelled" };
  }

  @Patch(":id/reschedule")
  async reschedule(@Param("id") id: string, @Body() dto: RescheduleAppointmentDto) {
    await this.appointmentService.reschedule(id, new Date(dto.newScheduledAt), dto.rescheduledBy, dto.reason);
    return { message: "Appointment rescheduled" };
  }

  @Patch(":id/complete")
  async complete(@Param("id") id: string, @Body() dto: { notes?: string }) {
    await this.appointmentService.complete(id, dto.notes);
    return { message: "Appointment completed" };
  }

  @Patch(":id/no-show")
  async markNoShow(@Param("id") id: string) {
    await this.appointmentService.markNoShow(id);
    return { message: "Appointment marked as no-show" };
  }
}
```

## DTOs

```typescript
// api/dtos/appointment.dto.ts

import { IsUUID, IsISO8601, IsInt, Min, Max, IsOptional, IsString } from "class-validator";

export class ScheduleAppointmentDto {
  @IsUUID() patientId: string;
  @IsUUID() tenantId: string;
  @IsUUID() clinicId: string;
  @IsUUID() doctorId: string;
  @IsISO8601() scheduledAt: string;
  @IsInt() @Min(15) @Max(480) duration: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ConfirmAppointmentDto {
  @IsString() confirmedBy: string;
}

export class CancelAppointmentDto {
  @IsString() cancelledBy: string;
  @IsOptional() @IsString() reason?: string;
}

export class RescheduleAppointmentDto {
  @IsISO8601() newScheduledAt: string;
  @IsString() rescheduledBy: string;
  @IsOptional() @IsString() reason?: string;
}
```

## Module Configuration

```typescript
// appointment.module.ts

import { Module } from "@nestjs/common";
import { AppointmentController } from "./api/appointment.controller";
import { AppointmentService } from "./application/appointment.service";
import { AppointmentProjectionHandler } from "./application/event-handlers/appointment-projection.handler";

@Module({
  controllers: [AppointmentController],
  providers: [
    AppointmentService,
    AppointmentProjectionHandler,
  ],
  exports: [AppointmentService],
})
export class AppointmentModule {}
```

**Nota:** Adicionar `AppointmentModule` nos imports do `AppModule`.

## Testes

### Testes do Agregado

```typescript
describe("Appointment Aggregate", () => {
  const futureDate = new Date(Date.now() + 86400000); // amanha

  it("should schedule appointment", () => {
    const appointment = Appointment.schedule({
      appointmentId: "appt-1",
      patientId: "patient-1",
      tenantId: "tenant-1",
      clinicId: "clinic-1",
      doctorId: "doctor-1",
      scheduledAt: futureDate,
      duration: 60,
      reason: "Consulta de rotina",
      correlationId: "corr-1",
    });

    expect(appointment.getStatus()).toBe("scheduled");
    const events = appointment.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("AppointmentScheduled");
  });

  it("should not schedule in the past", () => {
    expect(() => {
      Appointment.schedule({
        appointmentId: "appt-1",
        patientId: "patient-1",
        tenantId: "tenant-1",
        clinicId: "clinic-1",
        doctorId: "doctor-1",
        scheduledAt: new Date("2020-01-01"),
        duration: 60,
        correlationId: "corr-1",
      });
    }).toThrow("Appointment must be scheduled in the future");
  });

  it("should confirm scheduled appointment", () => {
    const appointment = createTestAppointment();
    appointment.clearUncommittedEvents();

    appointment.confirm({ confirmedBy: "patient", correlationId: "corr-2" });

    expect(appointment.getStatus()).toBe("confirmed");
    expect(appointment.getUncommittedEvents()[0].event_type).toBe("AppointmentConfirmed");
  });

  it("should cancel appointment", () => {
    const appointment = createTestAppointment();
    appointment.clearUncommittedEvents();

    appointment.cancel({ cancelledBy: "patient", reason: "Imprevisto", correlationId: "corr-2" });

    expect(appointment.getStatus()).toBe("cancelled");
  });

  it("should not cancel completed appointment", () => {
    const appointment = createTestAppointment();
    appointment.complete({ correlationId: "corr-2" });

    expect(() => {
      appointment.cancel({ cancelledBy: "patient", correlationId: "corr-3" });
    }).toThrow("Cannot cancel completed appointment");
  });

  it("should reschedule appointment", () => {
    const appointment = createTestAppointment();
    appointment.clearUncommittedEvents();

    const newDate = new Date(Date.now() + 172800000);
    appointment.reschedule({ newScheduledAt: newDate, rescheduledBy: "patient", correlationId: "corr-2" });

    expect(appointment.getScheduledAt()).toEqual(newDate);
    expect(appointment.getUncommittedEvents()[0].event_type).toBe("AppointmentRescheduled");
  });

  it("should mark as no-show", () => {
    const appointment = createTestAppointment();
    appointment.clearUncommittedEvents();

    appointment.markNoShow({ correlationId: "corr-2" });

    expect(appointment.getStatus()).toBe("no_show");
  });
});
```

## Checklist de Implementacao

- [ ] Criar Drizzle schema para appointment_view
- [ ] Criar factory functions para todos os 6 eventos
- [ ] Implementar Appointment Aggregate com regras de negocio
- [ ] Implementar AppointmentProjectionHandler com eventBus.subscribe()
- [ ] Implementar AppointmentService com validacao de conflitos
- [ ] Criar API REST (controller + DTOs)
- [ ] Configurar AppointmentModule
- [ ] Registrar no AppModule
- [ ] Rodar migration
- [ ] Criar testes unitarios do agregado
- [ ] Criar testes de integracao (projections)
- [ ] Criar testes E2E da API
- [ ] Validar deteccao de conflitos de horario

## Resultado Esperado

1. Agregado Appointment funcionando com todas as transicoes de estado
2. Projection appointment_view atualizada via Drizzle
3. Validacao de conflitos de horario
4. API REST para criar, confirmar, cancelar, reagendar, completar, no-show
5. Todos os testes passando

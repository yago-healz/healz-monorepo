import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../../../db";
import { appointmentView } from "../../../db/schema/appointment-view.schema";
import { patientJourneyView } from "../../../db/schema/patient-journey-view.schema";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { IEventStore } from "../../../event-sourcing/event-store/event-store.interface";
import { JourneyStage } from "../../domain/journey-stage";
import { PatientJourney } from "../../domain/patient-journey.aggregate";
import { RISK_FACTORS } from "../../domain/risk-score";

@Injectable()
export class PatientJourneyProcessManager implements OnModuleInit {
  private readonly logger = new Logger(PatientJourneyProcessManager.name);

  constructor(
    @Inject("IEventStore") private readonly eventStore: IEventStore,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe("PatientRegistered", {
      handle: (event) => this.onPatientRegistered(event),
    });
    this.eventBus.subscribe("MessageReceived", {
      handle: (event) => this.onMessageReceived(event),
    });
    this.eventBus.subscribe("AppointmentScheduled", {
      handle: (event) => this.onAppointmentScheduled(event),
    });
    this.eventBus.subscribe("AppointmentConfirmed", {
      handle: (event) => this.onAppointmentConfirmed(event),
    });
    this.eventBus.subscribe("AppointmentCancelled", {
      handle: (event) => this.onAppointmentCancelled(event),
    });
    this.eventBus.subscribe("AppointmentNoShow", {
      handle: (event) => this.onAppointmentNoShow(event),
    });
    this.eventBus.subscribe("AppointmentCompleted", {
      handle: (event) => this.onAppointmentCompleted(event),
    });
  }

  // Quando paciente e registrado, iniciar jornada
  private async onPatientRegistered(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journeyId = randomUUID();

    const journey = PatientJourney.start({
      journeyId,
      patientId: event.aggregate_id,
      tenantId: event.tenant_id,
      clinicId: event.clinic_id ?? "",
      correlationId: event.correlation_id,
      causationId: event.event_id,
    });

    await this.saveAndPublish(journey);
  }

  // Quando mensagem e recebida, atualizar engajamento
  private async onMessageReceived(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journey = await this.findJourneyByPatientId(data.patient_id);
    if (!journey) return;

    // Se estava em LEAD, mover para ENGAGED
    if (journey.getCurrentStage() === JourneyStage.LEAD) {
      journey.transitionTo({
        newStage: JourneyStage.ENGAGED,
        reason: "Patient sent first message",
        triggeredBy: event.event_id,
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    // Milestone: primeira mensagem
    if (journey.getMilestones().length === 0) {
      journey.reachMilestone({
        milestone: "first_message",
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    await this.saveAndPublish(journey);
  }

  // Quando appointment e agendado
  private async onAppointmentScheduled(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journey = await this.findJourneyByPatientId(data.patient_id);
    if (!journey) return;

    if (
      journey.getCurrentStage() === JourneyStage.ENGAGED ||
      journey.getCurrentStage() === JourneyStage.AT_RISK
    ) {
      journey.transitionTo({
        newStage: JourneyStage.SCHEDULED,
        reason: "Appointment scheduled",
        triggeredBy: event.event_id,
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    if (!journey.getMilestones().includes("first_appointment")) {
      journey.reachMilestone({
        milestone: "first_appointment",
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    await this.saveAndPublish(journey);
  }

  // Quando appointment e confirmado
  private async onAppointmentConfirmed(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journey = await this.findJourneyByAppointmentPatient(
      data.appointment_id,
    );
    if (!journey) return;

    if (journey.getCurrentStage() === JourneyStage.SCHEDULED) {
      journey.transitionTo({
        newStage: JourneyStage.CONFIRMED,
        reason: "Appointment confirmed",
        triggeredBy: event.event_id,
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    await this.saveAndPublish(journey);
  }

  // Quando appointment e cancelado
  private async onAppointmentCancelled(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journey = await this.findJourneyByAppointmentPatient(
      data.appointment_id,
    );
    if (!journey) return;

    // Verificar cancelamentos frequentes
    const cancellationCount = await this.getCancellationCount(
      journey.getPatientId(),
    );

    if (cancellationCount >= 2) {
      journey.detectRisk({
        factors: [RISK_FACTORS.FREQUENT_CANCELLATIONS],
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    } else {
      journey.transitionTo({
        newStage: JourneyStage.ENGAGED,
        reason: "Appointment cancelled",
        triggeredBy: event.event_id,
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    await this.saveAndPublish(journey);
  }

  // Quando ha no-show
  private async onAppointmentNoShow(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journey = await this.findJourneyByAppointmentPatient(
      data.appointment_id,
    );
    if (!journey) return;

    journey.detectRisk({
      factors: [RISK_FACTORS.NO_SHOW],
      correlationId: event.correlation_id,
      causationId: event.event_id,
    });

    await this.saveAndPublish(journey);
  }

  // Quando appointment e completado
  private async onAppointmentCompleted(event: DomainEvent): Promise<void> {
    const data = event.event_data;
    const journey = await this.findJourneyByAppointmentPatient(
      data.appointment_id,
    );
    if (!journey) return;

    journey.transitionTo({
      newStage: JourneyStage.IN_TREATMENT,
      reason: "Appointment completed",
      triggeredBy: event.event_id,
      correlationId: event.correlation_id,
      causationId: event.event_id,
    });

    if (!journey.getMilestones().includes("first_consultation_completed")) {
      journey.reachMilestone({
        milestone: "first_consultation_completed",
        correlationId: event.correlation_id,
        causationId: event.event_id,
      });
    }

    await this.saveAndPublish(journey);
  }

  // Helpers

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
    if (events.length === 0) return;
    await this.eventStore.appendMany(events);
    await this.eventBus.publishMany(events);
  }

  private async findJourneyByPatientId(
    patientId: string,
  ): Promise<PatientJourney | null> {
    const [result] = await db
      .select({ id: patientJourneyView.id })
      .from(patientJourneyView)
      .where(
        and(
          eq(patientJourneyView.patientId, patientId),
          ne(patientJourneyView.currentStage, JourneyStage.COMPLETED),
        ),
      );

    if (!result) return null;
    return this.loadAggregate(result.id);
  }

  private async findJourneyByAppointmentPatient(
    appointmentId: string,
  ): Promise<PatientJourney | null> {
    // Buscar o patientId do appointment e depois buscar a journey
    const [appt] = await db
      .select({ patientId: appointmentView.patientId })
      .from(appointmentView)
      .where(eq(appointmentView.id, appointmentId));

    if (!appt) return null;
    return this.findJourneyByPatientId(appt.patientId);
  }

  private async getCancellationCount(patientId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointmentView)
      .where(
        and(
          eq(appointmentView.patientId, patientId),
          eq(appointmentView.status, "cancelled"),
        ),
      );

    return result?.count || 0;
  }
}

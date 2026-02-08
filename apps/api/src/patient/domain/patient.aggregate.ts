import { AggregateRoot } from "../../event-sourcing/domain/aggregate-root";
import { DomainEvent } from "../../event-sourcing/domain/domain-event.interface";
import { createPatientRegisteredEvent, PatientRegisteredData } from "./events/patient-registered.event";
import { createPatientUpdatedEvent, PatientUpdatedData } from "./events/patient-updated.event";

export type PatientStatus = "active" | "inactive" | "suspended";

export class Patient extends AggregateRoot {
  private tenantId: string;
  private clinicId: string;
  private phone: string;
  private fullName?: string;
  private email?: string;
  private birthDate?: string;
  private status: PatientStatus;

  private constructor() {
    super();
  }

  static register(params: {
    patientId: string;
    tenantId: string;
    clinicId: string;
    phone: string;
    fullName?: string;
    email?: string;
    birthDate?: string;
    correlationId: string;
    userId?: string;
  }): Patient {
    const patient = new Patient();

    if (!params.phone) {
      throw new Error("Phone is required");
    }

    const event = createPatientRegisteredEvent({
      aggregateId: params.patientId,
      aggregateVersion: 1,
      tenantId: params.tenantId,
      clinicId: params.clinicId,
      correlationId: params.correlationId,
      userId: params.userId,
      data: {
        patient_id: params.patientId,
        tenant_id: params.tenantId,
        clinic_id: params.clinicId,
        phone: params.phone,
        full_name: params.fullName,
        email: params.email,
        birth_date: params.birthDate,
      },
    });

    patient.addEvent(event);
    return patient;
  }

  update(params: {
    fullName?: string;
    email?: string;
    birthDate?: string;
    correlationId: string;
    userId?: string;
  }): void {
    if (this.status === "suspended") {
      throw new Error("Cannot update suspended patient");
    }

    const event = createPatientUpdatedEvent({
      aggregateId: this.id,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      userId: params.userId,
      data: {
        patient_id: this.id,
        updates: {
          full_name: params.fullName,
          email: params.email,
          birth_date: params.birthDate,
        },
      },
    });

    this.addEvent(event);
  }

  protected applyEvent(event: DomainEvent): void {
    switch (event.event_type) {
      case "PatientRegistered":
        this.applyPatientRegistered(event.event_data as PatientRegisteredData);
        break;
      case "PatientUpdated":
        this.applyPatientUpdated(event.event_data as PatientUpdatedData);
        break;
    }
  }

  private applyPatientRegistered(data: PatientRegisteredData): void {
    this.id = data.patient_id;
    this.tenantId = data.tenant_id;
    this.clinicId = data.clinic_id;
    this.phone = data.phone;
    this.fullName = data.full_name;
    this.email = data.email;
    this.birthDate = data.birth_date;
    this.status = "active";
  }

  private applyPatientUpdated(data: PatientUpdatedData): void {
    if (data.updates.full_name !== undefined) this.fullName = data.updates.full_name;
    if (data.updates.email !== undefined) this.email = data.updates.email;
    if (data.updates.birth_date !== undefined) this.birthDate = data.updates.birth_date;
  }

  // Getters
  getPhone(): string { return this.phone; }
  getTenantId(): string { return this.tenantId; }
  getClinicId(): string { return this.clinicId; }
  getFullName(): string | undefined { return this.fullName; }
  getStatus(): PatientStatus { return this.status; }
}

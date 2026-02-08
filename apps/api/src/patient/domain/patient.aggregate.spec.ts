import { Patient } from "./patient.aggregate";

describe("Patient Aggregate", () => {
  it("should register new patient", () => {
    const patient = Patient.register({
      patientId: "patient-123",
      tenantId: "tenant-1",
      clinicId: "clinic-1",
      phone: "+5511999999999",
      fullName: "João Silva",
      correlationId: "corr-1",
    });

    const events = patient.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("PatientRegistered");
    expect(events[0].event_data.phone).toBe("+5511999999999");
    expect(events[0].event_data.full_name).toBe("João Silva");
    expect(patient.getPhone()).toBe("+5511999999999");
    expect(patient.getFullName()).toBe("João Silva");
    expect(patient.getStatus()).toBe("active");
  });

  it("should not register without phone", () => {
    expect(() => {
      Patient.register({
        patientId: "p-1",
        tenantId: "t-1",
        clinicId: "c-1",
        phone: "",
        correlationId: "corr-1",
      });
    }).toThrow("Phone is required");
  });

  it("should update patient information", () => {
    const patient = Patient.register({
      patientId: "p-1",
      tenantId: "t-1",
      clinicId: "c-1",
      phone: "+5511999999999",
      correlationId: "corr-1",
    });

    patient.clearUncommittedEvents();

    patient.update({
      fullName: "Maria Silva",
      email: "maria@example.com",
      correlationId: "corr-2",
    });

    const events = patient.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("PatientUpdated");
    expect(events[0].event_data.updates.full_name).toBe("Maria Silva");
    expect(events[0].event_data.updates.email).toBe("maria@example.com");
  });

  it("should reconstruct from history", () => {
    const patient = Patient.register({
      patientId: "p-1",
      tenantId: "t-1",
      clinicId: "c-1",
      phone: "+5511999999999",
      fullName: "João Silva",
      correlationId: "corr-1",
    });

    patient.update({
      fullName: "João da Silva",
      email: "joao@example.com",
      correlationId: "corr-2",
    });

    const events = patient.getUncommittedEvents();
    const reconstructed = new (Patient as any)();
    reconstructed.loadFromHistory(events);

    expect(reconstructed.getPhone()).toBe("+5511999999999");
    expect(reconstructed.getFullName()).toBe("João da Silva");
    expect(reconstructed.getVersion()).toBe(2);
  });

  it("should not update suspended patient", () => {
    const patient = Patient.register({
      patientId: "p-1",
      tenantId: "t-1",
      clinicId: "c-1",
      phone: "+5511999999999",
      correlationId: "corr-1",
    });

    // Force suspend status through reflection (just for testing)
    (patient as any).status = "suspended";

    expect(() => {
      patient.update({
        fullName: "New Name",
        correlationId: "corr-2",
      });
    }).toThrow("Cannot update suspended patient");
  });

  it("should increment version with each event", () => {
    const patient = Patient.register({
      patientId: "p-1",
      tenantId: "t-1",
      clinicId: "c-1",
      phone: "+5511999999999",
      correlationId: "corr-1",
    });

    expect(patient.getVersion()).toBe(1);

    patient.update({
      fullName: "Updated Name",
      correlationId: "corr-2",
    });

    expect(patient.getVersion()).toBe(2);
  });
});

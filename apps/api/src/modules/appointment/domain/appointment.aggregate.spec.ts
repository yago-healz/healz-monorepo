import { Appointment } from "./appointment.aggregate";

describe("Appointment Aggregate", () => {
  const futureDate = new Date(Date.now() + 86400000); // tomorrow
  const createTestAppointment = () => {
    return Appointment.schedule({
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
  };

  describe("schedule", () => {
    it("should schedule appointment", () => {
      const appointment = createTestAppointment();

      expect(appointment.getStatus()).toBe("scheduled");
      const events = appointment.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("AppointmentScheduled");
      expect(events[0].event_data.appointment_id).toBe("appt-1");
      expect(events[0].event_data.patient_id).toBe("patient-1");
      expect(events[0].event_data.doctor_id).toBe("doctor-1");
      expect(events[0].event_data.duration).toBe(60);
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

    it("should not schedule with invalid duration", () => {
      expect(() => {
        Appointment.schedule({
          appointmentId: "appt-1",
          patientId: "patient-1",
          tenantId: "tenant-1",
          clinicId: "clinic-1",
          doctorId: "doctor-1",
          scheduledAt: futureDate,
          duration: 0,
          correlationId: "corr-1",
        });
      }).toThrow("Duration must be between 1 and 480 minutes");
    });

    it("should not schedule with duration over 480 minutes", () => {
      expect(() => {
        Appointment.schedule({
          appointmentId: "appt-1",
          patientId: "patient-1",
          tenantId: "tenant-1",
          clinicId: "clinic-1",
          doctorId: "doctor-1",
          scheduledAt: futureDate,
          duration: 500,
          correlationId: "corr-1",
        });
      }).toThrow("Duration must be between 1 and 480 minutes");
    });
  });

  describe("confirm", () => {
    it("should confirm scheduled appointment", () => {
      const appointment = createTestAppointment();
      appointment.clearUncommittedEvents();

      appointment.confirm({ confirmedBy: "patient", correlationId: "corr-2" });

      expect(appointment.getStatus()).toBe("confirmed");
      const events = appointment.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("AppointmentConfirmed");
      expect(events[0].event_data.confirmed_by).toBe("patient");
    });

    it("should not confirm non-scheduled appointment", () => {
      const appointment = createTestAppointment();
      appointment.confirm({ confirmedBy: "patient", correlationId: "corr-2" });

      expect(() => {
        appointment.confirm({
          confirmedBy: "patient",
          correlationId: "corr-3",
        });
      }).toThrow("Only scheduled appointments can be confirmed");
    });
  });

  describe("cancel", () => {
    it("should cancel scheduled appointment", () => {
      const appointment = createTestAppointment();
      appointment.clearUncommittedEvents();

      appointment.cancel({
        cancelledBy: "patient",
        reason: "Imprevisto",
        correlationId: "corr-2",
      });

      expect(appointment.getStatus()).toBe("cancelled");
      const events = appointment.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("AppointmentCancelled");
      expect(events[0].event_data.cancelled_by).toBe("patient");
      expect(events[0].event_data.reason).toBe("Imprevisto");
    });

    it("should cancel confirmed appointment", () => {
      const appointment = createTestAppointment();
      appointment.confirm({ confirmedBy: "patient", correlationId: "corr-2" });
      appointment.clearUncommittedEvents();

      appointment.cancel({
        cancelledBy: "patient",
        correlationId: "corr-3",
      });

      expect(appointment.getStatus()).toBe("cancelled");
    });

    it("should not cancel completed appointment", () => {
      const appointment = createTestAppointment();
      appointment.complete({ correlationId: "corr-2" });

      expect(() => {
        appointment.cancel({
          cancelledBy: "patient",
          correlationId: "corr-3",
        });
      }).toThrow("Cannot cancel completed appointment");
    });

    it("should not cancel already cancelled appointment", () => {
      const appointment = createTestAppointment();
      appointment.cancel({ cancelledBy: "patient", correlationId: "corr-2" });

      expect(() => {
        appointment.cancel({
          cancelledBy: "patient",
          correlationId: "corr-3",
        });
      }).toThrow("Appointment is already cancelled");
    });
  });

  describe("reschedule", () => {
    it("should reschedule scheduled appointment", () => {
      const appointment = createTestAppointment();
      const originalDate = appointment.getScheduledAt();
      appointment.clearUncommittedEvents();

      const newDate = new Date(Date.now() + 172800000);
      appointment.reschedule({
        newScheduledAt: newDate,
        rescheduledBy: "patient",
        correlationId: "corr-2",
      });

      expect(appointment.getScheduledAt()).toEqual(newDate);
      const events = appointment.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("AppointmentRescheduled");
      expect(events[0].event_data.previous_scheduled_at).toBe(
        originalDate.toISOString(),
      );
      expect(events[0].event_data.new_scheduled_at).toBe(newDate.toISOString());
    });

    it("should reschedule confirmed appointment", () => {
      const appointment = createTestAppointment();
      appointment.confirm({ confirmedBy: "patient", correlationId: "corr-2" });
      appointment.clearUncommittedEvents();

      const newDate = new Date(Date.now() + 172800000);
      appointment.reschedule({
        newScheduledAt: newDate,
        rescheduledBy: "patient",
        correlationId: "corr-3",
      });

      expect(appointment.getScheduledAt()).toEqual(newDate);
      expect(appointment.getStatus()).toBe("confirmed");
    });

    it("should not reschedule to past date", () => {
      const appointment = createTestAppointment();

      expect(() => {
        appointment.reschedule({
          newScheduledAt: new Date("2020-01-01"),
          rescheduledBy: "patient",
          correlationId: "corr-2",
        });
      }).toThrow("New appointment time must be in the future");
    });

    it("should not reschedule cancelled appointment", () => {
      const appointment = createTestAppointment();
      appointment.cancel({ cancelledBy: "patient", correlationId: "corr-2" });

      expect(() => {
        appointment.reschedule({
          newScheduledAt: new Date(Date.now() + 172800000),
          rescheduledBy: "patient",
          correlationId: "corr-3",
        });
      }).toThrow("Only scheduled or confirmed appointments can be rescheduled");
    });
  });

  describe("complete", () => {
    it("should complete scheduled appointment", () => {
      const appointment = createTestAppointment();
      appointment.clearUncommittedEvents();

      appointment.complete({ notes: "Consulta realizada", correlationId: "corr-2" });

      expect(appointment.getStatus()).toBe("completed");
      const events = appointment.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("AppointmentCompleted");
      expect(events[0].event_data.notes).toBe("Consulta realizada");
    });

    it("should complete confirmed appointment", () => {
      const appointment = createTestAppointment();
      appointment.confirm({ confirmedBy: "patient", correlationId: "corr-2" });
      appointment.clearUncommittedEvents();

      appointment.complete({ correlationId: "corr-3" });

      expect(appointment.getStatus()).toBe("completed");
    });

    it("should not complete cancelled appointment", () => {
      const appointment = createTestAppointment();
      appointment.cancel({ cancelledBy: "patient", correlationId: "corr-2" });

      expect(() => {
        appointment.complete({ correlationId: "corr-3" });
      }).toThrow("Only scheduled or confirmed appointments can be completed");
    });
  });

  describe("markNoShow", () => {
    it("should mark scheduled appointment as no-show", () => {
      const appointment = createTestAppointment();
      appointment.clearUncommittedEvents();

      appointment.markNoShow({ correlationId: "corr-2" });

      expect(appointment.getStatus()).toBe("no_show");
      const events = appointment.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("AppointmentNoShow");
    });

    it("should mark confirmed appointment as no-show", () => {
      const appointment = createTestAppointment();
      appointment.confirm({ confirmedBy: "patient", correlationId: "corr-2" });
      appointment.clearUncommittedEvents();

      appointment.markNoShow({ correlationId: "corr-3" });

      expect(appointment.getStatus()).toBe("no_show");
    });

    it("should not mark cancelled appointment as no-show", () => {
      const appointment = createTestAppointment();
      appointment.cancel({ cancelledBy: "patient", correlationId: "corr-2" });

      expect(() => {
        appointment.markNoShow({ correlationId: "corr-3" });
      }).toThrow(
        "Only scheduled or confirmed appointments can be marked as no-show",
      );
    });
  });
});

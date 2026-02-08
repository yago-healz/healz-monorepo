import request from "supertest";
import {
  E2eTestContext,
  closeE2eTestContext,
  createE2eTestContext,
} from "../../helpers/test-context.helper";
import { randomUUID } from "crypto";

describe("Appointment (e2e)", () => {
  let context: E2eTestContext;

  beforeAll(async () => {
    context = await createE2eTestContext();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterAll(async () => {
    await closeE2eTestContext(context);
  });

  describe("POST /appointments", () => {
    it("should schedule a new appointment", async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const patientId = randomUUID();
      const doctorId = randomUUID();

      const response = await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId,
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId,
          scheduledAt: futureDate,
          duration: 60,
          reason: "Consulta de rotina",
          notes: "Primeira consulta",
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(typeof response.body.id).toBe("string");

      // Verificar se foi criado no banco
      const result = await context.pool.query(
        "SELECT * FROM appointment_view WHERE id = $1",
        [response.body.id],
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].patient_id).toBe(patientId);
      expect(result.rows[0].doctor_id).toBe(doctorId);
      expect(result.rows[0].status).toBe("scheduled");
      expect(result.rows[0].duration).toBe(60);
    });

    it("should not schedule appointment in the past", async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();

      const pastDate = new Date("2020-01-01").toISOString();

      const response = await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId: randomUUID(),
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId: randomUUID(),
          scheduledAt: pastDate,
          duration: 60,
        })
        .expect(500);

      expect(response.body.message).toContain(
        "Appointment must be scheduled in the future",
      );
    });

    it("should not schedule appointment with conflicting time slot", async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const doctorId = randomUUID();

      // Criar primeiro agendamento
      await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId: randomUUID(),
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId,
          scheduledAt: futureDate,
          duration: 60,
        })
        .expect(201);

      // Tentar criar segundo agendamento no mesmo horário e médico
      const response = await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId: randomUUID(),
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId,
          scheduledAt: futureDate,
          duration: 60,
        })
        .expect(500);

      expect(response.body.message).toContain("Time slot not available");
    });
  });

  describe("GET /appointments/:id", () => {
    it("should get appointment by id", async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const patientId = randomUUID();

      const createResponse = await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId,
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId: randomUUID(),
          scheduledAt: futureDate,
          duration: 60,
          reason: "Consulta",
        })
        .expect(201);

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/appointments/${createResponse.body.id}`)
        .expect(200);

      expect(response.body.id).toBe(createResponse.body.id);
      expect(response.body.patient_id).toBe(patientId);
      expect(response.body.status).toBe("scheduled");
    });

    it("should return 404 for non-existent appointment", async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/appointments/${randomUUID()}`)
        .expect(404);

      expect(response.body.message).toContain("Appointment not found");
    });
  });

  describe("GET /appointments", () => {
    it("should list appointments with filters", async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const patientId = randomUUID();
      const doctorId = randomUUID();

      // Criar alguns agendamentos
      await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId,
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId,
          scheduledAt: futureDate,
          duration: 60,
        })
        .expect(201);

      await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId: randomUUID(),
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId,
          scheduledAt: new Date(Date.now() + 172800000).toISOString(),
          duration: 30,
        })
        .expect(201);

      // Buscar por patientId
      const byPatient = await request(context.app.getHttpServer())
        .get(`/api/v1/appointments?patientId=${patientId}`)
        .expect(200);

      expect(Array.isArray(byPatient.body)).toBe(true);
      expect(byPatient.body.length).toBe(1);
      expect(byPatient.body[0].patient_id).toBe(patientId);

      // Buscar por doctorId
      const byDoctor = await request(context.app.getHttpServer())
        .get(`/api/v1/appointments?doctorId=${doctorId}`)
        .expect(200);

      expect(byDoctor.body.length).toBe(2);
    });
  });

  describe("PATCH /appointments/:id/confirm", () => {
    it("should confirm scheduled appointment", async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();

      const futureDate = new Date(Date.now() + 86400000).toISOString();

      const createResponse = await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId: randomUUID(),
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId: randomUUID(),
          scheduledAt: futureDate,
          duration: 60,
        })
        .expect(201);

      await request(context.app.getHttpServer())
        .patch(`/api/v1/appointments/${createResponse.body.id}/confirm`)
        .send({ confirmedBy: "patient" })
        .expect(200);

      // Aguardar projection ser atualizada
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verificar status no banco
      const result = await context.pool.query(
        "SELECT status, confirmed_at FROM appointment_view WHERE id = $1",
        [createResponse.body.id],
      );
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].status).toBe("confirmed");
      expect(result.rows[0].confirmed_at).toBeDefined();
    });
  });

  describe("PATCH /appointments/:id/cancel", () => {
    it("should cancel scheduled appointment", async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();

      const futureDate = new Date(Date.now() + 86400000).toISOString();

      const createResponse = await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId: randomUUID(),
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId: randomUUID(),
          scheduledAt: futureDate,
          duration: 60,
        })
        .expect(201);

      await request(context.app.getHttpServer())
        .patch(`/api/v1/appointments/${createResponse.body.id}/cancel`)
        .send({ cancelledBy: "patient", reason: "Imprevisto" })
        .expect(200);

      // Verificar status no banco
      const result = await context.pool.query(
        "SELECT status, cancelled_at FROM appointment_view WHERE id = $1",
        [createResponse.body.id],
      );
      expect(result.rows[0].status).toBe("cancelled");
      expect(result.rows[0].cancelled_at).toBeDefined();
    });
  });

  describe("PATCH /appointments/:id/reschedule", () => {
    it("should reschedule appointment", async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const newDate = new Date(Date.now() + 172800000).toISOString();

      const createResponse = await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId: randomUUID(),
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId: randomUUID(),
          scheduledAt: futureDate,
          duration: 60,
        })
        .expect(201);

      await request(context.app.getHttpServer())
        .patch(`/api/v1/appointments/${createResponse.body.id}/reschedule`)
        .send({
          newScheduledAt: newDate,
          rescheduledBy: "patient",
        })
        .expect(200);

      // Verificar nova data no banco
      const result = await context.pool.query(
        "SELECT scheduled_at FROM appointment_view WHERE id = $1",
        [createResponse.body.id],
      );
      expect(new Date(result.rows[0].scheduled_at).getTime()).toBeCloseTo(
        new Date(newDate).getTime(),
        -3,
      );
    });

    it("should not reschedule to conflicting time slot", async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();

      const futureDate1 = new Date(Date.now() + 86400000).toISOString();
      const futureDate2 = new Date(Date.now() + 172800000).toISOString();
      const doctorId = randomUUID();

      // Criar primeiro agendamento
      await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId: randomUUID(),
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId,
          scheduledAt: futureDate1,
          duration: 60,
        })
        .expect(201);

      // Criar segundo agendamento
      const createResponse2 = await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId: randomUUID(),
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId,
          scheduledAt: futureDate2,
          duration: 60,
        })
        .expect(201);

      // Tentar reagendar segundo para o horário do primeiro
      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/appointments/${createResponse2.body.id}/reschedule`)
        .send({
          newScheduledAt: futureDate1,
          rescheduledBy: "patient",
        })
        .expect(500);

      expect(response.body.message).toContain("New time slot not available");
    });
  });

  describe("PATCH /appointments/:id/complete", () => {
    it("should complete appointment", async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();

      const futureDate = new Date(Date.now() + 86400000).toISOString();

      const createResponse = await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId: randomUUID(),
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId: randomUUID(),
          scheduledAt: futureDate,
          duration: 60,
        })
        .expect(201);

      await request(context.app.getHttpServer())
        .patch(`/api/v1/appointments/${createResponse.body.id}/complete`)
        .send({ notes: "Consulta realizada com sucesso" })
        .expect(200);

      // Verificar status no banco
      const result = await context.pool.query(
        "SELECT status, completed_at, notes FROM appointment_view WHERE id = $1",
        [createResponse.body.id],
      );
      expect(result.rows[0].status).toBe("completed");
      expect(result.rows[0].completed_at).toBeDefined();
      expect(result.rows[0].notes).toBe("Consulta realizada com sucesso");
    });
  });

  describe("PATCH /appointments/:id/no-show", () => {
    it("should mark appointment as no-show", async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();

      const futureDate = new Date(Date.now() + 86400000).toISOString();

      const createResponse = await request(context.app.getHttpServer())
        .post("/api/v1/appointments")
        .send({
          patientId: randomUUID(),
          tenantId: org.id,
          clinicId: clinic.id,
          doctorId: randomUUID(),
          scheduledAt: futureDate,
          duration: 60,
        })
        .expect(201);

      await request(context.app.getHttpServer())
        .patch(`/api/v1/appointments/${createResponse.body.id}/no-show`)
        .expect(200);

      // Verificar status no banco
      const result = await context.pool.query(
        "SELECT status FROM appointment_view WHERE id = $1",
        [createResponse.body.id],
      );
      expect(result.rows[0].status).toBe("no_show");
    });
  });
});

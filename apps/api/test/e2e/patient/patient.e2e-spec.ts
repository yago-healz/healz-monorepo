import request from 'supertest';
import { randomUUID } from 'crypto';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../helpers/test-context.helper';

describe('Patient (e2e)', () => {
  let context: E2eTestContext;
  let tenantId: string;
  let clinicId: string;

  beforeEach(async () => {
    context = await createE2eTestContext();
    await context.dbHelper.cleanDatabase();

    // Create organization and clinic for testing
    const orgResult = await context.pool.query(
      `INSERT INTO organizations (id, name, slug, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [randomUUID(), 'Test Org', 'test-org', 'active']
    );
    tenantId = orgResult.rows[0].id;

    const clinicResult = await context.pool.query(
      `INSERT INTO clinics (id, organization_id, name, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [randomUUID(), tenantId, 'Test Clinic', 'active']
    );
    clinicId = clinicResult.rows[0].id;
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /patients', () => {
    it('should register a new patient and create events', async () => {
      const patientData = {
        tenant_id: tenantId,
        clinic_id: clinicId,
        phone: '+5511999999999',
        full_name: 'João Silva',
        email: 'joao@example.com',
        birth_date: '1990-01-15',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/patients')
        .send(patientData)
        .expect(201);

      expect(response.body).toHaveProperty('patient_id');
      const patientId = response.body.patient_id;

      // Wait for projection to be updated
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify patient in projection
      const projectionResult = await context.pool.query(
        'SELECT * FROM patient_view WHERE id = $1',
        [patientId]
      );

      expect(projectionResult.rows).toHaveLength(1);
      const patient = projectionResult.rows[0];
      expect(patient.phone).toBe('+5511999999999');
      expect(patient.full_name).toBe('João Silva');  // DB returns snake_case
      expect(patient.email).toBe('joao@example.com');
      expect(patient.status).toBe('active');

      // Verify event in event store
      const eventsResult = await context.pool.query(
        'SELECT * FROM events WHERE aggregate_id = $1 ORDER BY aggregate_version',
        [patientId]
      );

      expect(eventsResult.rows).toHaveLength(1);
      const event = eventsResult.rows[0];
      expect(event.event_type).toBe('PatientRegistered');
      expect(event.aggregate_type).toBe('Patient');
      expect(event.aggregate_version).toBe(1);
      expect(event.event_data.phone).toBe('+5511999999999');
    });

    it('should register patient with minimal data (phone only)', async () => {
      const patientData = {
        tenant_id: tenantId,
        clinic_id: clinicId,
        phone: '+5511988888888',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/patients')
        .send(patientData)
        .expect(201);

      const patientId = response.body.patient_id;

      await new Promise(resolve => setTimeout(resolve, 100));

      const projectionResult = await context.pool.query(
        'SELECT * FROM patient_view WHERE id = $1',
        [patientId]
      );

      const patient = projectionResult.rows[0];
      expect(patient.phone).toBe('+5511988888888');
      expect(patient.full_name).toBeNull();  // DB returns snake_case
      expect(patient.email).toBeNull();
    });

    it('should fail with invalid phone format', async () => {
      const patientData = {
        tenant_id: tenantId,
        clinic_id: clinicId,
        phone: 'invalid-phone',
      };

      await request(context.app.getHttpServer())
        .post('/api/v1/patients')
        .send(patientData)
        .expect(400);
    });

    it('should fail without required fields', async () => {
      await request(context.app.getHttpServer())
        .post('/api/v1/patients')
        .send({})
        .expect(400);
    });
  });

  describe('GET /patients/:id', () => {
    it('should get patient by id', async () => {
      const patientData = {
        tenant_id: tenantId,
        clinic_id: clinicId,
        phone: '+5511999999999',
        full_name: 'Maria Silva',
      };

      const createResponse = await request(context.app.getHttpServer())
        .post('/api/v1/patients')
        .send(patientData)
        .expect(201);

      const patientId = createResponse.body.patient_id;

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/patients/${patientId}`)
        .expect(200);

      expect(response.body.id).toBe(patientId);
      expect(response.body.phone).toBe('+5511999999999');
      expect(response.body.fullName).toBe('Maria Silva');
    });

    it('should return 404 for non-existent patient', async () => {
      const fakeId = randomUUID();

      await request(context.app.getHttpServer())
        .get(`/api/v1/patients/${fakeId}`)
        .expect(404);
    });
  });

  describe('GET /patients', () => {
    it('should list patients by tenant', async () => {
      const patient1 = {
        tenant_id: tenantId,
        clinic_id: clinicId,
        phone: '+5511111111111',
        full_name: 'Patient 1',
      };

      const patient2 = {
        tenant_id: tenantId,
        clinic_id: clinicId,
        phone: '+5511222222222',
        full_name: 'Patient 2',
      };

      await request(context.app.getHttpServer())
        .post('/api/v1/patients')
        .send(patient1)
        .expect(201);

      await request(context.app.getHttpServer())
        .post('/api/v1/patients')
        .send(patient2)
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/patients?tenant_id=${tenantId}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].fullName).toBe('Patient 1');
      expect(response.body[1].fullName).toBe('Patient 2');
    });

    it('should filter patients by clinic', async () => {
      const clinic2Result = await context.pool.query(
        `INSERT INTO clinics (id, organization_id, name, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [randomUUID(), tenantId, 'Clinic 2', 'active']
      );
      const clinic2Id = clinic2Result.rows[0].id;

      await request(context.app.getHttpServer())
        .post('/api/v1/patients')
        .send({
          tenant_id: tenantId,
          clinic_id: clinicId,
          phone: '+5511111111111',
        })
        .expect(201);

      await request(context.app.getHttpServer())
        .post('/api/v1/patients')
        .send({
          tenant_id: tenantId,
          clinic_id: clinic2Id,
          phone: '+5511222222222',
        })
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/patients?tenant_id=${tenantId}&clinic_id=${clinicId}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].clinicId).toBe(clinicId);
    });
  });

  describe('PATCH /patients/:id', () => {
    it('should update patient information', async () => {
      const createResponse = await request(context.app.getHttpServer())
        .post('/api/v1/patients')
        .send({
          tenant_id: tenantId,
          clinic_id: clinicId,
          phone: '+5511999999999',
        })
        .expect(201);

      const patientId = createResponse.body.patient_id;

      await new Promise(resolve => setTimeout(resolve, 100));

      await request(context.app.getHttpServer())
        .patch(`/api/v1/patients/${patientId}`)
        .send({
          full_name: 'Updated Name',
          email: 'updated@example.com',
          birth_date: '1985-05-20',
        })
        .expect(200);

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/patients/${patientId}`)
        .expect(200);

      expect(response.body.fullName).toBe('Updated Name');
      expect(response.body.email).toBe('updated@example.com');
      expect(response.body.birthDate).toBe('1985-05-20');

      // Verify events
      const eventsResult = await context.pool.query(
        'SELECT * FROM events WHERE aggregate_id = $1 ORDER BY aggregate_version',
        [patientId]
      );

      expect(eventsResult.rows).toHaveLength(2);
      expect(eventsResult.rows[0].event_type).toBe('PatientRegistered');
      expect(eventsResult.rows[1].event_type).toBe('PatientUpdated');
      expect(eventsResult.rows[1].aggregate_version).toBe(2);
    });

    it('should update only specified fields', async () => {
      const createResponse = await request(context.app.getHttpServer())
        .post('/api/v1/patients')
        .send({
          tenant_id: tenantId,
          clinic_id: clinicId,
          phone: '+5511999999999',
          full_name: 'Original Name',
          email: 'original@example.com',
        })
        .expect(201);

      const patientId = createResponse.body.patient_id;

      await new Promise(resolve => setTimeout(resolve, 100));

      await request(context.app.getHttpServer())
        .patch(`/api/v1/patients/${patientId}`)
        .send({
          full_name: 'New Name',
        })
        .expect(200);

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/patients/${patientId}`)
        .expect(200);

      expect(response.body.fullName).toBe('New Name');
      expect(response.body.email).toBe('original@example.com');
    });
  });
});

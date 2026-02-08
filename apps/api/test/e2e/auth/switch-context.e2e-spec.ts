import { randomUUID } from 'crypto';
import request from 'supertest';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  closeE2eTestContext,
  createE2eTestContext,
} from '../../helpers/test-context.helper';

const decodeJwtPayload = (token: string) => {
  const [, payload] = token.split('.');
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const decoded = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(decoded);
};

describe('Auth - Switch Context (e2e)', () => {
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

  describe('POST /auth/switch-context', () => {
    it('should switch clinic context when user has access', async () => {
      const org = await context.fixtures.createOrganization();
      const clinicOne = await context.fixtures.createClinic(org.id, { name: 'Clinic A' });
      const clinicTwo = await context.fixtures.createClinic(org.id, { name: 'Clinic B' });
      const doctor = await context.fixtures.createUser({
        email: TestFixtures.DOCTOR.email,
        password: TestFixtures.DOCTOR.password,
        name: TestFixtures.DOCTOR.name,
      });
      await context.fixtures.createUserClinic(doctor.id, clinicOne.id, 'doctor');
      await context.fixtures.createUserClinic(doctor.id, clinicTwo.id, 'doctor');

      const login = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.DOCTOR.email,
          password: TestFixtures.DOCTOR.password,
        })
        .expect(200);

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/switch-context')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ clinicId: clinicTwo.id })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      const payload = decodeJwtPayload(response.body.accessToken);
      expect(payload.activeClinicId).toBe(clinicTwo.id);
    });

    it('should return 400 when user does not belong to the clinic', async () => {
      const org = await context.fixtures.createOrganization();
      const clinic = await context.fixtures.createClinic(org.id);
      const doctor = await context.fixtures.createUser({
        email: TestFixtures.DOCTOR.email,
        password: TestFixtures.DOCTOR.password,
        name: TestFixtures.DOCTOR.name,
      });
      await context.fixtures.createUserClinic(doctor.id, clinic.id, 'doctor');

      const login = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.DOCTOR.email,
          password: TestFixtures.DOCTOR.password,
        })
        .expect(200);

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/switch-context')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ clinicId: randomUUID() })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('User does not have access');
    });

    it('should return 401 when token is missing', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/switch-context')
        .send({ clinicId: randomUUID() })
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 400 for invalid clinicId format', async () => {
      await context.fixtures.createCompleteSetup();

      const login = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        })
        .expect(200);

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/switch-context')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ clinicId: 'invalid-uuid' })
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });
  });
});

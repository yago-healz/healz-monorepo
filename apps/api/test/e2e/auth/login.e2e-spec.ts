import request from 'supertest';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../helpers/test-context.helper';

describe('Auth - Login (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /auth/login', () => {
    it('should return 200 and tokens for valid credentials', async () => {
      await context.fixtures.createCompleteSetup();

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      TestAssertions.assertUserStructure(response.body.user);
      expect(response.body.user.email).toBe(TestFixtures.ORG_ADMIN.email);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('should return 401 for invalid password', async () => {
      await context.fixtures.createCompleteSetup();

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: 'WrongPassword123',
        })
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'ghost@test.com',
          password: 'AnyPassword123',
        })
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'AnyPassword123',
        })
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'user@test.com',
        })
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should allow selecting a specific clinic during login', async () => {
      const org = await context.fixtures.createOrganization();
      const clinicOne = await context.fixtures.createClinic(org.id, { name: 'Clinic 1' });
      const clinicTwo = await context.fixtures.createClinic(org.id, { name: 'Clinic 2' });
      const doctor = await context.fixtures.createUser({
        email: TestFixtures.DOCTOR.email,
        password: TestFixtures.DOCTOR.password,
        name: TestFixtures.DOCTOR.name,
      });
      await context.fixtures.createUserClinic(doctor.id, clinicOne.id, 'doctor');
      await context.fixtures.createUserClinic(doctor.id, clinicTwo.id, 'doctor');

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.DOCTOR.email,
          password: TestFixtures.DOCTOR.password,
          clinicId: clinicTwo.id,
        })
        .expect(200);

      expect(response.body.user.activeClinic.id).toBe(clinicTwo.id);
      expect(response.body.user.availableClinics).toHaveLength(2);
    });
  });
});

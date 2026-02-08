import request from 'supertest';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import { TestAuthHelper } from '../../helpers/test-auth.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../helpers/test-context.helper';

describe('Clinics - Add Member (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /clinics/:clinicId/members', () => {
    it('should add a member to clinic successfully', async () => {
      const { org, clinic, admin } = await context.fixtures.createCompleteSetup();
      const userToAdd = await context.fixtures.createUser({
        email: 'newdoctor@test.com',
        password: 'Doctor123!@#',
        name: 'Dr. New Doctor',
      });

      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/clinics/${clinic.id}/members`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          userId: userToAdd.id,
          role: 'doctor',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Usuário adicionado à clínica com sucesso');
      expect(response.body).toHaveProperty('member');
      expect(response.body.member).toHaveProperty('userId', userToAdd.id);
      expect(response.body.member).toHaveProperty('clinicId', clinic.id);
      expect(response.body.member).toHaveProperty('role', 'doctor');
    });

    it('should return 401 when not authenticated', async () => {
      const { clinic } = await context.fixtures.createCompleteSetup();

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/clinics/${clinic.id}/members`)
        .send({
          userId: 'some-user-id',
          role: 'doctor',
        })
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 404 when user does not exist', async () => {
      const { org, clinic, admin } = await context.fixtures.createCompleteSetup();

      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/clinics/${clinic.id}/members`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          userId: '550e8400-e29b-41d4-a716-446655440000',
          role: 'doctor',
        })
        .expect(404);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid role', async () => {
      const { org, clinic, admin } = await context.fixtures.createCompleteSetup();
      const userToAdd = await context.fixtures.createUser({
        email: 'newdoctor@test.com',
        password: 'Doctor123!@#',
        name: 'Dr. New Doctor',
      });

      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/clinics/${clinic.id}/members`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          userId: userToAdd.id,
          role: 'invalid-role',
        })
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should return 400 when member already exists in clinic', async () => {
      const { org, clinic, admin } = await context.fixtures.createCompleteSetup();
      const userToAdd = await context.fixtures.createUser({
        email: 'newsecretary@test.com',
        password: 'Secretary123!@#',
        name: 'New Secretary',
      });

      await context.fixtures.createUserClinic(userToAdd.id, clinic.id, 'secretary');

      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/clinics/${clinic.id}/members`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          userId: userToAdd.id,
          role: 'doctor',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });
});

import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Add User to Clinic (e2e)', () => {
  let context: E2eTestContext;
  let adminToken: string;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
    
    // Create platform admin and login
    const admin = await context.fixtures.createPlatformAdmin();
    const loginResponse = await request(context.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: TestFixtures.PLATFORM_ADMIN.email,
        password: TestFixtures.PLATFORM_ADMIN.password,
      });
    adminToken = loginResponse.body.accessToken;
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /platform-admin/users/:userId/clinics', () => {
    it('should return 201 and add user to clinic as doctor', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'addtoclinic@example.com',
        password: 'User123!@#',
        name: 'User to Add',
      });

      const addData = {
        clinicId: clinic.id,
        role: 'doctor',
      };

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/clinics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(addData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Usuário adicionado à clínica');
    });

    it('should return 201 and add user to clinic as secretary', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'addassec@example.com',
        password: 'User123!@#',
        name: 'Secretary User',
      });

      const addData = {
        clinicId: clinic.id,
        role: 'secretary',
      };

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/clinics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(addData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Usuário adicionado à clínica');
    });

    it('should return 400 for duplicate clinic assignment', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'duplicateclinic@example.com',
        password: 'User123!@#',
        name: 'User Duplicate',
      });
      
      // First assignment
      await context.fixtures.createUserClinic(user.id, clinic.id, 'doctor');

      // Try to add again
      const addData = {
        clinicId: clinic.id,
        role: 'secretary',
      };

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/clinics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(addData)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 401 without authentication token', async () => {
      const { clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'unauthorized@example.com',
        password: 'User123!@#',
        name: 'Test User',
      });

      const addData = {
        clinicId: clinic.id,
        role: 'doctor',
      };

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/clinics`)
        .send(addData)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 403 for non-platform-admin user', async () => {
      const { clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'forbidden@example.com',
        password: 'User123!@#',
        name: 'Test User',
      });

      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        });

      const userToken = loginResponse.body.accessToken;

      const addData = {
        clinicId: clinic.id,
        role: 'doctor',
      };

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/clinics`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(addData)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

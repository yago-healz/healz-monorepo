import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Update User Clinic Role (e2e)', () => {
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

  describe('PATCH /platform-admin/users/:userId/clinics/:clinicId', () => {
    it('should return 200 and update user role from doctor to secretary', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'updaterole@example.com',
        password: 'User123!@#',
        name: 'User Update Role',
      });
      await context.fixtures.createUserClinic(user.id, clinic.id, 'doctor');

      const updateData = {
        role: 'secretary',
      };

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/users/${user.id}/clinics/${clinic.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('userId', user.id);
      expect(response.body).toHaveProperty('clinicId', clinic.id);
      expect(response.body).toHaveProperty('role', 'secretary');
    });

    it('should return 200 and update user role to admin', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'promoteadmin@example.com',
        password: 'User123!@#',
        name: 'Promote to Admin',
      });
      await context.fixtures.createUserClinic(user.id, clinic.id, 'secretary');

      const updateData = {
        role: 'admin',
      };

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/users/${user.id}/clinics/${clinic.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('role', 'admin');
    });

    it('should return 404 when user is not in clinic', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'notinclinic@example.com',
        password: 'User123!@#',
        name: 'Not In Clinic',
      });
      // Do NOT add user to clinic

      const updateData = {
        role: 'doctor',
      };

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/users/${user.id}/clinics/${clinic.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('should return 401 without authentication token', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'unauthorized@example.com',
        password: 'User123!@#',
        name: 'Test User',
      });
      await context.fixtures.createUserClinic(user.id, clinic.id, 'doctor');

      const updateData = {
        role: 'secretary',
      };

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/users/${user.id}/clinics/${clinic.id}`)
        .send(updateData)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 403 for non-platform-admin user', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'forbidden@example.com',
        password: 'User123!@#',
        name: 'Test User',
      });
      await context.fixtures.createUserClinic(user.id, clinic.id, 'doctor');

      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        });

      const userToken = loginResponse.body.accessToken;

      const updateData = {
        role: 'secretary',
      };

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/users/${user.id}/clinics/${clinic.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

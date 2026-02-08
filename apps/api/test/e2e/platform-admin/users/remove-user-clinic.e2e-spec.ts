import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Remove User from Clinic (e2e)', () => {
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

  describe('DELETE /platform-admin/users/:userId/clinics/:clinicId', () => {
    it('should return 200 and remove user from clinic', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'removefromclinic@example.com',
        password: 'User123!@#',
        name: 'User to Remove',
      });
      await context.fixtures.createUserClinic(user.id, clinic.id, 'doctor');

      const response = await request(context.app.getHttpServer())
        .delete(`/api/v1/platform-admin/users/${user.id}/clinics/${clinic.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('removido');
    });

    it('should return 404 when user is not in clinic', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'notinclinic@example.com',
        password: 'User123!@#',
        name: 'Not In Clinic',
      });
      // Do NOT add user to clinic

      const response = await request(context.app.getHttpServer())
        .delete(`/api/v1/platform-admin/users/${user.id}/clinics/${clinic.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
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

      const response = await request(context.app.getHttpServer())
        .delete(`/api/v1/platform-admin/users/${user.id}/clinics/${clinic.id}`)
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

      const response = await request(context.app.getHttpServer())
        .delete(`/api/v1/platform-admin/users/${user.id}/clinics/${clinic.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

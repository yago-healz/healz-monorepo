import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Reset Password (e2e)', () => {
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

  describe('POST /platform-admin/users/:id/reset-password', () => {
    it('should return 200 and reset password sending email', async () => {
      const user = await context.fixtures.createUser({
        email: 'resetpassword@example.com',
        password: 'OldPass123!',
        name: 'User Reset Password',
      });

      const resetData = {
        sendEmail: true,
      };

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(resetData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('reset');
    });

    it('should return 200 and reset password returning temporary password', async () => {
      const user = await context.fixtures.createUser({
        email: 'temppassword@example.com',
        password: 'OldPass123!',
        name: 'User Temp Password',
      });

      const resetData = {
        sendEmail: false,
      };

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(resetData)
        .expect(201);

      expect(response.body).toHaveProperty('temporaryPassword');
      expect(response.body.temporaryPassword).toBeTruthy();
    });

    it('should return 401 without authentication token', async () => {
      const user = await context.fixtures.createUser({
        email: 'unauthorized@example.com',
        password: 'User123!@#',
        name: 'Test User',
      });

      const resetData = {
        sendEmail: true,
      };

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/reset-password`)
        .send(resetData)
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

      const resetData = {
        sendEmail: true,
      };

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/reset-password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(resetData)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

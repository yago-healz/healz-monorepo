import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Update User (e2e)', () => {
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

  describe('PATCH /platform-admin/users/:id', () => {
    it('should return 200 and update user name', async () => {
      const user = await context.fixtures.createUser({
        email: 'updateuser@example.com',
        password: 'User123!@#',
        name: 'Old Name',
      });

      const updateData = {
        name: 'New Name',
      };

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('atualizado');
    });

    it('should return 200 and update user email', async () => {
      const user = await context.fixtures.createUser({
        email: 'oldemail@example.com',
        password: 'User123!@#',
        name: 'Test User',
      });

      const updateData = {
        email: 'newemail@example.com',
      };

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('atualizado');
    });

    it('should return 400 for invalid data', async () => {
      const user = await context.fixtures.createUser({
        email: 'invalidupdate@example.com',
        password: 'User123!@#',
        name: 'Test User',
      });

      const invalidData = {
        name: 'A', // Too short
        email: 'invalid-email-format',
      };

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should return 401 without authentication token', async () => {
      const user = await context.fixtures.createUser({
        email: 'unauthorized@example.com',
        password: 'User123!@#',
        name: 'Test User',
      });

      const updateData = {
        name: 'New Name',
      };

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/users/${user.id}`)
        .send(updateData)
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

      const updateData = {
        name: 'New Name',
      };

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/users/${user.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

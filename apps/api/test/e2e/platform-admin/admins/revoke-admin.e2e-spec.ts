import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import { TestAuthHelper } from '../../../helpers/test-auth.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Revoke Admin (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('DELETE /platform-admin/admins/:id', () => {
    it('should revoke platform admin permissions', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const newUser = await context.fixtures.createUser({
        email: 'torevoke@healz.com',
        password: 'Admin123!@#',
        name: 'Admin To Revoke',
      });

      const createResponse = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/admins')
        .set(TestAuthHelper.authHeader(accessToken))
        .send({ userId: newUser.id })
        .expect(201);

      const adminId = createResponse.body.id;

      const revokeResponse = await request(context.app.getHttpServer())
        .delete(`/api/v1/platform-admin/admins/${adminId}`)
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(200);

      expect(revokeResponse.body).toHaveProperty('message');
      expect(revokeResponse.body.message).toContain('revogadas');
    });

    it('should return 404 when admin does not exist', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const nonExistentId = randomUUID();
      const response = await request(context.app.getHttpServer())
        .delete(`/api/v1/platform-admin/admins/${nonExistentId}`)
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 when user is not platform admin', async () => {
      const { admin } = await context.fixtures.createCompleteSetup();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .delete('/api/v1/platform-admin/admins/some-id')
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(context.app.getHttpServer())
        .delete('/api/v1/platform-admin/admins/some-id')
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });
  });
});

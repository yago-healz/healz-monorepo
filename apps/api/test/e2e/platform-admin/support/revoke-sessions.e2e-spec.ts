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

describe('Platform Admin - Revoke Sessions (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /platform-admin/users/:id/revoke-sessions', () => {
    it('should revoke all user sessions', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const { admin } = await context.fixtures.createCompleteSetup();

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${admin.id}/revoke-sessions`)
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('revogadas');
      expect(response.body).toHaveProperty('revokedCount');
      expect(typeof response.body.revokedCount).toBe('number');
    });

    it('should return success even when user has no active sessions', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const user = await context.fixtures.createUser({
        email: 'nosessions@test.com',
        password: 'Test123!@#',
        name: 'User Without Sessions',
      });

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/revoke-sessions`)
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('revokedCount', 0);
    });

    it('should return 403 when user is not platform admin', async () => {
      const { admin } = await context.fixtures.createCompleteSetup();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const targetUser = await context.fixtures.createUser({
        email: 'target@test.com',
        password: 'Test123!@#',
        name: 'Target User',
      });

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${targetUser.id}/revoke-sessions`)
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });

    it('should return 401 when not authenticated', async () => {
      const targetUser = await context.fixtures.createUser({
        email: 'target@test.com',
        password: 'Test123!@#',
        name: 'Target User',
      });

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${targetUser.id}/revoke-sessions`)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });
  });
});

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

describe('Platform Admin - Impersonate (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /platform-admin/users/:id/impersonate', () => {
    it('should impersonate user and return impersonation token', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const { admin, clinic } = await context.fixtures.createCompleteSetup();

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${admin.id}/impersonate`)
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', admin.id);
      expect(response.body.user).toHaveProperty('email', admin.email);
      expect(response.body.user).toHaveProperty('isImpersonating', true);
      expect(response.body.user).toHaveProperty('impersonatedBy');
      expect(response.body.user.impersonatedBy).toBe(platformAdmin.id);
    });

    it('should return 404 when user does not exist', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const nonExistentId = randomUUID();
      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${nonExistentId}/impersonate`)
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when user is inactive', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const inactiveUser = await context.fixtures.createUser({
        email: 'inactive@test.com',
        password: 'Test123!@#',
        name: 'Inactive User',
        status: 'inactive',
      });

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${inactiveUser.id}/impersonate`)
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('inativo');
    });

    it('should return 400 when user has no clinic access', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const userWithoutClinic = await context.fixtures.createUser({
        email: 'noclinic@test.com',
        password: 'Test123!@#',
        name: 'User Without Clinic',
      });

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${userWithoutClinic.id}/impersonate`)
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('clínica');
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
        .post(`/api/v1/platform-admin/users/${targetUser.id}/impersonate`)
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
        .post(`/api/v1/platform-admin/users/${targetUser.id}/impersonate`)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });
  });
});

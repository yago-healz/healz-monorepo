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

describe('Platform Admin - Create Admin (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /platform-admin/admins', () => {
    it('should create a new platform admin', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const newUser = await context.fixtures.createUser({
        email: 'newadmin@healz.com',
        password: 'Admin123!@#',
        name: 'New Platform Admin',
      });

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/admins')
        .set(TestAuthHelper.authHeader(accessToken))
        .send({ userId: newUser.id })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', newUser.id);
      expect(response.body.user).toHaveProperty('email', newUser.email);
      expect(response.body.user).toHaveProperty('name', newUser.name);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('concedidas');
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
        .post('/api/v1/platform-admin/admins')
        .set(TestAuthHelper.authHeader(accessToken))
        .send({ userId: nonExistentId })
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when user is already platform admin', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/admins')
        .set(TestAuthHelper.authHeader(accessToken))
        .send({ userId: platformAdmin.id })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('já é platform admin');
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
        .post('/api/v1/platform-admin/admins')
        .set(TestAuthHelper.authHeader(accessToken))
        .send({ userId: targetUser.id })
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
        .post('/api/v1/platform-admin/admins')
        .send({ userId: targetUser.id })
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });
  });
});

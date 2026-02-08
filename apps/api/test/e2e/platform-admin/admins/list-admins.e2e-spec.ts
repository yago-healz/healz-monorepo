import request from 'supertest';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import { TestAuthHelper } from '../../../helpers/test-auth.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - List Admins (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('GET /platform-admin/admins', () => {
    it('should list all platform admins', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      await context.fixtures.createPlatformAdmin({
        email: 'admin2@healz.com',
        password: 'Admin123!@#',
        name: 'Second Admin',
      });

      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/admins')
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      const adminEntry = response.body.data[0];
      expect(adminEntry).toHaveProperty('id');
      expect(adminEntry).toHaveProperty('user');
      expect(adminEntry.user).toHaveProperty('id');
      expect(adminEntry.user).toHaveProperty('name');
      expect(adminEntry.user).toHaveProperty('email');
      expect(adminEntry).toHaveProperty('createdAt');
      expect(adminEntry).toHaveProperty('status');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/admins')
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 403 when user is not platform admin', async () => {
      const { admin } = await context.fixtures.createCompleteSetup();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/admins')
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

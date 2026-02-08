import request from 'supertest';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import { TestAuthHelper } from '../../../helpers/test-auth.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - List Clinics (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('GET /platform-admin/clinics', () => {
    it('should list all clinics with pagination', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const org = await context.fixtures.createOrganization();
      await context.fixtures.createClinic(org.id, { name: 'Clinic A' });
      await context.fixtures.createClinic(org.id, { name: 'Clinic B' });

      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/clinics')
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter clinics by organization', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const org1 = await context.fixtures.createOrganization({ name: 'Org 1' });
      const org2 = await context.fixtures.createOrganization({ name: 'Org 2' });
      await context.fixtures.createClinic(org1.id, { name: 'Clinic Org1' });
      await context.fixtures.createClinic(org2.id, { name: 'Clinic Org2' });

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/clinics?organizationId=${org1.id}`)
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('Clinic Org1');
    });

    it('should search clinics by name', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const org = await context.fixtures.createOrganization();
      await context.fixtures.createClinic(org.id, { name: 'Alpha Clinic' });
      await context.fixtures.createClinic(org.id, { name: 'Beta Clinic' });

      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/clinics?search=Alpha')
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('Alpha Clinic');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/clinics')
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
        .get('/api/v1/platform-admin/clinics')
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });

    it('should support pagination parameters', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const org = await context.fixtures.createOrganization();
      for (let i = 1; i <= 5; i++) {
        await context.fixtures.createClinic(org.id, { name: `Clinic ${i}` });
      }

      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/clinics?page=1&limit=2')
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data.length).toBe(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(2);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(5);
    });
  });
});

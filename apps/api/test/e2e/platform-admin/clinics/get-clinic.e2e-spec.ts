import request from 'supertest';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import { TestAuthHelper } from '../../../helpers/test-auth.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Get Clinic (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('GET /platform-admin/clinics/:id', () => {
    it('should return clinic details successfully', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const org = await context.fixtures.createOrganization();
      const clinic = await context.fixtures.createClinic(org.id, { name: 'Test Clinic' });

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/clinics/${clinic.id}`)
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(200);

      expect(response.body).toHaveProperty('id', clinic.id);
      expect(response.body).toHaveProperty('name', 'Test Clinic');
      expect(response.body).toHaveProperty('organization');
      expect(response.body.organization).toHaveProperty('id', org.id);
      expect(response.body).toHaveProperty('status');
    });

    it('should return 404 when clinic does not exist', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/clinics/550e8400-e29b-41d4-a716-446655440000')
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 when not authenticated', async () => {
      const org = await context.fixtures.createOrganization();
      const clinic = await context.fixtures.createClinic(org.id);

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/clinics/${clinic.id}`)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 403 when user is not platform admin', async () => {
      const { org, clinic, admin } = await context.fixtures.createCompleteSetup();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/clinics/${clinic.id}`)
        .set(TestAuthHelper.authHeader(accessToken))
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

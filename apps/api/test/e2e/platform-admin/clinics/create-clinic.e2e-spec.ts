import request from 'supertest';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import { TestAuthHelper } from '../../../helpers/test-auth.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Create Clinic (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /platform-admin/clinics', () => {
    it('should create a new clinic successfully', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const org = await context.fixtures.createOrganization();

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/clinics')
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          organizationId: org.id,
          name: 'New Clinic via Platform Admin',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'New Clinic via Platform Admin');
      expect(response.body).toHaveProperty('organizationId', org.id);
      expect(response.body).toHaveProperty('status', 'active');
    });

    it('should create clinic with initial admin', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const org = await context.fixtures.createOrganization();
      const initialAdmin = await context.fixtures.createUser({
        email: 'initial@admin.com',
        password: 'Password123!',
        name: 'Initial Admin',
      });

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/clinics')
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          organizationId: org.id,
          name: 'Clinic With Admin',
          initialAdminId: initialAdmin.id,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Clinic With Admin');
    });

    it('should return 400 for invalid organization id', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/clinics')
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          organizationId: 'invalid-uuid',
          name: 'Test Clinic',
        })
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should return 400 when clinic name is too short', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const org = await context.fixtures.createOrganization();

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/clinics')
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          organizationId: org.id,
          name: 'AB',
        })
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should return 403 when user is not platform admin', async () => {
      const { org, admin } = await context.fixtures.createCompleteSetup();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/clinics')
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          organizationId: org.id,
          name: 'Test Clinic',
        })
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

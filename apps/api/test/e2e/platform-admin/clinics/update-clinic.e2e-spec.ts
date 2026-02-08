import request from 'supertest';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import { TestAuthHelper } from '../../../helpers/test-auth.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Update Clinic (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('PATCH /platform-admin/clinics/:id', () => {
    it('should update clinic name successfully', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const org = await context.fixtures.createOrganization();
      const clinic = await context.fixtures.createClinic(org.id, { name: 'Old Name' });

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/clinics/${clinic.id}`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          name: 'Updated Clinic Name',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Clínica atualizada com sucesso');
    });

    it('should return 404 when clinic does not exist', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .patch('/api/v1/platform-admin/clinics/550e8400-e29b-41d4-a716-446655440000')
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          name: 'Updated Name',
        })
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('should return 400 for invalid clinic name (too short)', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const org = await context.fixtures.createOrganization();
      const clinic = await context.fixtures.createClinic(org.id);

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/clinics/${clinic.id}`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          name: 'AB',
        })
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should return 401 when not authenticated', async () => {
      const org = await context.fixtures.createOrganization();
      const clinic = await context.fixtures.createClinic(org.id);

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/clinics/${clinic.id}`)
        .send({
          name: 'Updated Name',
        })
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
        .patch(`/api/v1/platform-admin/clinics/${clinic.id}`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          name: 'Updated Name',
        })
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

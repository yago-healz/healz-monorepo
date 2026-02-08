import request from 'supertest';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import { TestAuthHelper } from '../../../helpers/test-auth.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Transfer Clinic (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('PATCH /platform-admin/clinics/:id/transfer', () => {
    it('should transfer clinic to another organization', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const sourceOrg = await context.fixtures.createOrganization({ name: 'Source Org' });
      const targetOrg = await context.fixtures.createOrganization({ name: 'Target Org' });
      const clinic = await context.fixtures.createClinic(sourceOrg.id, { name: 'Clinic to Transfer' });

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/clinics/${clinic.id}/transfer`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          targetOrganizationId: targetOrg.id,
          keepUsers: false,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Clínica transferida com sucesso');
    });

    it('should transfer clinic keeping users', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const sourceOrg = await context.fixtures.createOrganization({ name: 'Source Org' });
      const targetOrg = await context.fixtures.createOrganization({ name: 'Target Org' });
      const clinic = await context.fixtures.createClinic(sourceOrg.id);

      const user = await context.fixtures.createUser({
        email: 'doctor@test.com',
        password: 'Password123!',
        name: 'Doctor',
      });
      await context.fixtures.createUserClinic(user.id, clinic.id, 'doctor');

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/clinics/${clinic.id}/transfer`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          targetOrganizationId: targetOrg.id,
          keepUsers: true,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Clínica transferida com sucesso');
    });

    it('should return 404 when clinic does not exist', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const targetOrg = await context.fixtures.createOrganization();

      const response = await request(context.app.getHttpServer())
        .patch('/api/v1/platform-admin/clinics/550e8400-e29b-41d4-a716-446655440000/transfer')
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          targetOrganizationId: targetOrg.id,
        })
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('should return 400 for invalid target organization id', async () => {
      const platformAdmin = await context.fixtures.createPlatformAdmin();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        platformAdmin.email,
        TestFixtures.PLATFORM_ADMIN.password,
      );

      const org = await context.fixtures.createOrganization();
      const clinic = await context.fixtures.createClinic(org.id);

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/clinics/${clinic.id}/transfer`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          targetOrganizationId: 'invalid-uuid',
        })
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should return 401 when not authenticated', async () => {
      const org = await context.fixtures.createOrganization();
      const clinic = await context.fixtures.createClinic(org.id);

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/clinics/${clinic.id}/transfer`)
        .send({
          targetOrganizationId: '550e8400-e29b-41d4-a716-446655440000',
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

      const targetOrg = await context.fixtures.createOrganization();

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/clinics/${clinic.id}/transfer`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          targetOrganizationId: targetOrg.id,
        })
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

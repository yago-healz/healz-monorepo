import request from 'supertest';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import { TestAuthHelper } from '../../helpers/test-auth.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../helpers/test-context.helper';

describe('Organizations - Create Clinic (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /organizations/:organizationId/clinics', () => {
    it('should create a new clinic successfully', async () => {
      const { org, admin } = await context.fixtures.createCompleteSetup();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/organizations/${org.id}/clinics`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          name: 'New Test Clinic',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'New Test Clinic');
      expect(response.body).toHaveProperty('organizationId', org.id);
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 401 when not authenticated', async () => {
      const { org } = await context.fixtures.createCompleteSetup();

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/organizations/${org.id}/clinics`)
        .send({
          name: 'New Test Clinic',
        })
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 404 when organization does not exist', async () => {
      const { admin } = await context.fixtures.createCompleteSetup();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/organizations/550e8400-e29b-41d4-a716-446655440000/clinics`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          name: 'New Test Clinic',
        })
        .expect(404);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid clinic name (too short)', async () => {
      const { org, admin } = await context.fixtures.createCompleteSetup();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/organizations/${org.id}/clinics`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({
          name: 'AB',
        })
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should return 400 when clinic name is missing', async () => {
      const { org, admin } = await context.fixtures.createCompleteSetup();
      const { accessToken } = await TestAuthHelper.login(
        context.app,
        admin.email,
        TestFixtures.ORG_ADMIN.password,
      );

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/organizations/${org.id}/clinics`)
        .set(TestAuthHelper.authHeader(accessToken))
        .send({})
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });
  });
});

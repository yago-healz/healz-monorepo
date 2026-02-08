import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Get User (e2e)', () => {
  let context: E2eTestContext;
  let adminToken: string;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
    
    // Create platform admin and login
    const admin = await context.fixtures.createPlatformAdmin();
    const loginResponse = await request(context.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: TestFixtures.PLATFORM_ADMIN.email,
        password: TestFixtures.PLATFORM_ADMIN.password,
      });
    adminToken = loginResponse.body.accessToken;
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('GET /platform-admin/users/:id', () => {
    it('should return 200 and user details', async () => {
      const { clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'testuser@example.com',
        password: 'User123!@#',
        name: 'Test User',
      });
      await context.fixtures.createUserClinic(user.id, clinic.id, 'doctor');

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', user.id);
      expect(response.body).toHaveProperty('name', 'Test User');
      expect(response.body).toHaveProperty('email', 'testuser@example.com');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('emailVerified');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('clinics');
      expect(Array.isArray(response.body.clinics)).toBe(true);
    });

    it('should return 401 without authentication token', async () => {
      const user = await context.fixtures.createUser({
        email: 'testuser@example.com',
        password: 'User123!@#',
        name: 'Test User',
      });

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/users/${user.id}`)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 403 for non-platform-admin user', async () => {
      const { clinic, admin } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'targetuser@example.com',
        password: 'User123!@#',
        name: 'Target User',
      });

      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        });

      const userToken = loginResponse.body.accessToken;

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/users/${user.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = randomUUID();

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });
  });
});

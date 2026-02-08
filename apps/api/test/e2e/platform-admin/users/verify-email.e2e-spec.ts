import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Verify Email (e2e)', () => {
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

  describe('POST /platform-admin/users/:id/verify-email', () => {
    it('should return 200 and verify user email', async () => {
      // Create user with unverified email
      const { rows: [user] } = await context.pool.query(
        `INSERT INTO users (id, email, password_hash, name, email_verified, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [randomUUID(), 'unverified@example.com', 'hashedpassword', 'Unverified User', false, 'active']
      );

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/verify-email`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('verificado');
    });

    it('should return 200 for already verified email', async () => {
      const user = await context.fixtures.createUser({
        email: 'alreadyverified@example.com',
        password: 'User123!@#',
        name: 'Already Verified User',
      });

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/verify-email`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('verificado');
    });

    it('should return 401 without authentication token', async () => {
      const user = await context.fixtures.createUser({
        email: 'unauthorized@example.com',
        password: 'User123!@#',
        name: 'Test User',
      });

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/verify-email`)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 403 for non-platform-admin user', async () => {
      const { clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'forbidden@example.com',
        password: 'User123!@#',
        name: 'Test User',
      });

      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        });

      const userToken = loginResponse.body.accessToken;

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${user.id}/verify-email`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = randomUUID();

      const response = await request(context.app.getHttpServer())
        .post(`/api/v1/platform-admin/users/${nonExistentId}/verify-email`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });
  });
});

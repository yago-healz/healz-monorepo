import request from 'supertest';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - List Users (e2e)', () => {
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

  describe('GET /platform-admin/users', () => {
    it('should return 200 and paginated list of users', async () => {
      // Create test data
      const { clinic } = await context.fixtures.createCompleteSetup();
      await context.fixtures.createUser({
        email: 'doctor1@test.com',
        password: 'Doctor123!@#',
        name: 'Doctor One',
      });
      await context.fixtures.createUser({
        email: 'doctor2@test.com',
        password: 'Doctor123!@#',
        name: 'Doctor Two',
      });

      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      TestAssertions.assertPaginatedResponse(response.body);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(2);
      
      // Verify user structure
      const user = response.body.data[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('status');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/users')
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 403 for non-platform-admin user', async () => {
      const { clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'user@test.com',
        password: 'User123!@#',
        name: 'Regular User',
      });
      await context.fixtures.createUserClinic(user.id, clinic.id, 'doctor');

      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'user@test.com',
          password: 'User123!@#',
        });

      const userToken = loginResponse.body.accessToken;

      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });

    it('should filter users by status', async () => {
      const { clinic } = await context.fixtures.createCompleteSetup();
      
      // Create active user
      const activeUser = await context.fixtures.createUser({
        email: 'active@test.com',
        password: 'User123!@#',
        name: 'Active User',
      });
      
      // Create inactive user by updating status in database
      const inactiveUser = await context.fixtures.createUser({
        email: 'inactive@test.com',
        password: 'User123!@#',
        name: 'Inactive User',
      });
      await context.pool.query(
        `UPDATE users SET status = 'inactive' WHERE id = $1`,
        [inactiveUser.id]
      );

      // Test filtering by active status
      const activeResponse = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/users?status=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(activeResponse.body.data.every((u: any) => u.status === 'active')).toBe(true);

      // Test filtering by inactive status
      const inactiveResponse = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/users?status=inactive')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(inactiveResponse.body.data.every((u: any) => u.status === 'inactive')).toBe(true);
    });

    it('should search users by name or email', async () => {
      await context.fixtures.createUser({
        email: 'john.doe@example.com',
        password: 'User123!@#',
        name: 'John Doe',
      });
      await context.fixtures.createUser({
        email: 'jane.smith@test.com',
        password: 'User123!@#',
        name: 'Jane Smith',
      });
      await context.fixtures.createUser({
        email: 'other@example.com',
        password: 'User123!@#',
        name: 'Other User',
      });

      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/users?search=john')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.every((u: any) => 
        u.name.toLowerCase().includes('john') || 
        u.email.toLowerCase().includes('john')
      )).toBe(true);
    });

    it('should paginate results correctly', async () => {
      // Create 5 users
      for (let i = 1; i <= 5; i++) {
        await context.fixtures.createUser({
          email: `user${i}@test.com`,
          password: 'User123!@#',
          name: `User ${i}`,
        });
      }

      // Test first page with limit 2
      const page1Response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(page1Response.body.data.length).toBe(2);
      expect(page1Response.body.meta.page).toBe(1);
      expect(page1Response.body.meta.limit).toBe(2);
      expect(page1Response.body.meta.totalPages).toBeGreaterThanOrEqual(3);

      // Test second page
      const page2Response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/users?page=2&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(page2Response.body.data.length).toBe(2);
      expect(page2Response.body.meta.page).toBe(2);
    });
  });
});

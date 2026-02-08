import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Get Organization (e2e)', () => {
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

  describe('GET /platform-admin/organizations/:id', () => {
    it('should return 200 and organization details', async () => {
      // Create organization with clinics and admins
      const org = await context.fixtures.createOrganization({
        name: 'Test Organization',
        slug: 'test-org-detail',
      });
      const clinic1 = await context.fixtures.createClinic(org.id, { name: 'Clinic 1' });
      const clinic2 = await context.fixtures.createClinic(org.id, { name: 'Clinic 2' });
      
      const admin = await context.fixtures.createUser({
        email: 'admin@test.com',
        password: 'Admin123!@#',
        name: 'Admin User',
      });
      await context.fixtures.createUserClinic(admin.id, clinic1.id, 'admin');
      await context.fixtures.createUserClinic(admin.id, clinic2.id, 'admin');

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/organizations/${org.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', org.id);
      expect(response.body).toHaveProperty('name', 'Test Organization');
      expect(response.body).toHaveProperty('slug', 'test-org-detail');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).toHaveProperty('clinics');
      expect(response.body).toHaveProperty('admins');
      expect(response.body).toHaveProperty('stats');

      // Verify clinics
      expect(Array.isArray(response.body.clinics)).toBe(true);
      expect(response.body.clinics).toHaveLength(2);
      expect(response.body.clinics[0]).toHaveProperty('id');
      expect(response.body.clinics[0]).toHaveProperty('name');
      expect(response.body.clinics[0]).toHaveProperty('status');
      expect(response.body.clinics[0]).toHaveProperty('usersCount');

      // Verify admins
      expect(Array.isArray(response.body.admins)).toBe(true);
      expect(response.body.admins.length).toBeGreaterThan(0);
      expect(response.body.admins[0]).toHaveProperty('userId');
      expect(response.body.admins[0]).toHaveProperty('name');
      expect(response.body.admins[0]).toHaveProperty('email');

      // Verify stats
      expect(response.body.stats).toHaveProperty('totalUsers');
      expect(response.body.stats).toHaveProperty('totalClinics');
      expect(response.body.stats.totalClinics).toBe(2);
    });

    it('should return 404 for non-existent organization', async () => {
      const nonExistentId = randomUUID();

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/organizations/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 without authentication token', async () => {
      const org = await context.fixtures.createOrganization();

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/organizations/${org.id}`)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 403 for non-platform-admin user', async () => {
      // Create regular user with clinic association
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
      const org = await context.fixtures.createOrganization();

      const response = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/organizations/${org.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - List Organizations (e2e)', () => {
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

  describe('GET /platform-admin/organizations', () => {
    it('should return 200 and paginated list of organizations', async () => {
      // Create multiple organizations
      await context.fixtures.createOrganization({ name: 'Org 1', slug: 'org-1' });
      await context.fixtures.createOrganization({ name: 'Org 2', slug: 'org-2' });
      await context.fixtures.createOrganization({ name: 'Org 3', slug: 'org-3' });

      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      TestAssertions.assertPaginatedResponse(response.body);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.total).toBe(3);
      
      // Verify organization structure
      const org = response.body.data[0];
      expect(org).toHaveProperty('id');
      expect(org).toHaveProperty('name');
      expect(org).toHaveProperty('slug');
      expect(org).toHaveProperty('status');
      expect(org).toHaveProperty('stats');
      expect(org.stats).toHaveProperty('clinicsCount');
      expect(org.stats).toHaveProperty('usersCount');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/organizations')
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

      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/organizations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });

    it('should filter organizations by status', async () => {
      // Create organizations with different statuses
      await context.fixtures.createOrganization({ 
        name: 'Active Org', 
        slug: 'active-org',
        status: 'active'
      });
      await context.fixtures.createOrganization({ 
        name: 'Inactive Org', 
        slug: 'inactive-org',
        status: 'inactive'
      });

      // Test filtering by active status
      const activeResponse = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/organizations?status=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(activeResponse.body.data).toHaveLength(1);
      expect(activeResponse.body.data[0].name).toBe('Active Org');

      // Test filtering by inactive status
      const inactiveResponse = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/organizations?status=inactive')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(inactiveResponse.body.data).toHaveLength(1);
      expect(inactiveResponse.body.data[0].name).toBe('Inactive Org');
    });

    it('should search organizations by name or slug', async () => {
      await context.fixtures.createOrganization({ name: 'Clinica Sao Paulo', slug: 'clinica-sp' });
      await context.fixtures.createOrganization({ name: 'Clinica Rio', slug: 'clinica-rj' });
      await context.fixtures.createOrganization({ name: 'Hospital Central', slug: 'hospital-central' });

      const response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/organizations?search=clinica')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((org: any) => 
        org.name.toLowerCase().includes('clinica') || 
        org.slug.toLowerCase().includes('clinica')
      )).toBe(true);
    });

    it('should paginate results correctly', async () => {
      // Create 5 organizations
      for (let i = 1; i <= 5; i++) {
        await context.fixtures.createOrganization({ 
          name: `Org ${i}`, 
          slug: `org-${i}` 
        });
      }

      // Test first page with limit 2
      const page1Response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/organizations?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(page1Response.body.data).toHaveLength(2);
      expect(page1Response.body.meta.page).toBe(1);
      expect(page1Response.body.meta.limit).toBe(2);
      expect(page1Response.body.meta.total).toBe(5);
      expect(page1Response.body.meta.totalPages).toBe(3);

      // Test second page
      const page2Response = await request(context.app.getHttpServer())
        .get('/api/v1/platform-admin/organizations?page=2&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(page2Response.body.data).toHaveLength(2);
      expect(page2Response.body.meta.page).toBe(2);
    });
  });
});

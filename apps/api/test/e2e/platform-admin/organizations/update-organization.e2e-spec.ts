import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Update Organization (e2e)', () => {
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

  describe('PATCH /platform-admin/organizations/:id', () => {
    it('should return 200 and update organization name', async () => {
      const org = await context.fixtures.createOrganization({
        name: 'Old Name',
        slug: 'test-org-update',
      });

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/organizations/${org.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Name',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Organização atualizada');

      // Verify update by fetching the organization
      const getResponse = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/organizations/${org.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.name).toBe('New Name');
      expect(getResponse.body.slug).toBe('test-org-update'); // Unchanged
    });

    it('should return 200 and update organization slug', async () => {
      const org = await context.fixtures.createOrganization({
        name: 'Test Org',
        slug: 'old-slug',
      });

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/organizations/${org.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'new-slug',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify update
      const getResponse = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/organizations/${org.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.slug).toBe('new-slug');
    });

    it('should return 400 for duplicate slug', async () => {
      // Create first organization
      await context.fixtures.createOrganization({
        name: 'First Org',
        slug: 'first-slug',
      });

      // Create second organization
      const org2 = await context.fixtures.createOrganization({
        name: 'Second Org',
        slug: 'second-slug',
      });

      // Try to update second org with first org's slug
      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/organizations/${org2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'first-slug',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('Slug já existe');
    });

    it('should return 404 for non-existent organization', async () => {
      const nonExistentId = randomUUID();

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/organizations/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Name',
        })
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body.message).toContain('Organização não encontrada');
    });

    it('should return 401 without authentication token', async () => {
      const org = await context.fixtures.createOrganization();

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/organizations/${org.id}`)
        .send({
          name: 'New Name',
        })
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });
  });
});

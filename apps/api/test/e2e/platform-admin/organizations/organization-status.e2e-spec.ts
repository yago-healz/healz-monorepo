import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Organization Status (e2e)', () => {
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

  describe('PATCH /platform-admin/organizations/:id/status', () => {
    it('should return 200 and deactivate organization', async () => {
      const org = await context.fixtures.createOrganization({
        name: 'Active Org',
        slug: 'active-org-status',
        status: 'active',
      });

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/organizations/${org.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          reason: 'Inadimplência',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('desativada');

      // Verify status change
      const getResponse = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/organizations/${org.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.status).toBe('inactive');
    });

    it('should return 200 and activate organization', async () => {
      const org = await context.fixtures.createOrganization({
        name: 'Inactive Org',
        slug: 'inactive-org-status',
        status: 'inactive',
      });

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/organizations/${org.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'active',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('ativada');

      // Verify status change
      const getResponse = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/organizations/${org.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.status).toBe('active');
    });

    it('should deactivate all clinics when deactivating organization', async () => {
      const org = await context.fixtures.createOrganization({
        name: 'Org With Clinics',
        slug: 'org-with-clinics',
        status: 'active',
      });

      // Create active clinics
      const clinic1 = await context.fixtures.createClinic(org.id, { 
        name: 'Clinic 1',
        status: 'active',
      });
      const clinic2 = await context.fixtures.createClinic(org.id, { 
        name: 'Clinic 2',
        status: 'active',
      });

      // Deactivate organization
      await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/organizations/${org.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          reason: 'Test deactivation',
        })
        .expect(200);

      // Verify clinics are deactivated
      const getResponse = await request(context.app.getHttpServer())
        .get(`/api/v1/platform-admin/organizations/${org.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.clinics.every((clinic: any) => 
        clinic.status === 'inactive'
      )).toBe(true);
    });

    it('should return 404 for non-existent organization', async () => {
      const nonExistentId = randomUUID();

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/organizations/${nonExistentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
        })
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body.message).toContain('Organização não encontrada');
    });

    it('should return 401 without authentication token', async () => {
      const org = await context.fixtures.createOrganization();

      const response = await request(context.app.getHttpServer())
        .patch(`/api/v1/platform-admin/organizations/${org.id}/status`)
        .send({
          status: 'inactive',
        })
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });
  });
});

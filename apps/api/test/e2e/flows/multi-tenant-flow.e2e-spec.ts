import request from 'supertest';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../helpers/test-context.helper';

describe('Flows - Multi-Tenant Flow (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('Multi-Tenant Flow', () => {
    it('should handle complete multi-tenant flow: login → access clinic 1 → switch context → access clinic 2', async () => {
      // Setup: Create organization with multiple clinics
      const org = await context.fixtures.createOrganization({
        name: 'Multi-Clinic Org',
        slug: 'multi-clinic-org',
      });

      const clinic1 = await context.fixtures.createClinic(org.id, { name: 'Clinic One' });
      const clinic2 = await context.fixtures.createClinic(org.id, { name: 'Clinic Two' });
      const clinic3 = await context.fixtures.createClinic(org.id, { name: 'Clinic Three' });

      // Create user with access to multiple clinics
      const user = await context.fixtures.createUser({
        email: 'multitenant@example.com',
        password: 'MultiTenant123!',
        name: 'Multi Tenant User',
        emailVerified: true,
      });

      // Add user to all three clinics with different roles
      await context.fixtures.createUserClinic(user.id, clinic1.id, 'admin');
      await context.fixtures.createUserClinic(user.id, clinic2.id, 'doctor');
      await context.fixtures.createUserClinic(user.id, clinic3.id, 'secretary');

      // Step 1: Login (should default to first clinic or have logic to choose)
      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'multitenant@example.com',
          password: 'MultiTenant123!',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body.user).toHaveProperty('availableClinics');
      expect(loginResponse.body.user.availableClinics).toHaveLength(3);

      const token1 = loginResponse.body.accessToken;
      const activeClinic1 = loginResponse.body.user.activeClinic;

      // Verify user can see all their clinics (API uses clinicId, not id)
      const availableClinicIds = loginResponse.body.user.availableClinics.map(
        (c: any) => c.clinicId,
      );
      expect(availableClinicIds).toContain(clinic1.id);
      expect(availableClinicIds).toContain(clinic2.id);
      expect(availableClinicIds).toContain(clinic3.id);

      // Step 2: Access resources in the first clinic
      // Verify the token has the correct active clinic
      const decodedToken1 = JSON.parse(
        Buffer.from(token1.split('.')[1], 'base64').toString(),
      );
      expect(decodedToken1.activeClinicId).toBe(activeClinic1.id);

      // Step 3: Switch context to clinic 2
      const switchResponse1 = await request(context.app.getHttpServer())
        .post('/api/v1/auth/switch-context')
        .set('Authorization', `Bearer ${token1}`)
        .send({ clinicId: clinic2.id })
        .expect(200);

      expect(switchResponse1.body).toHaveProperty('accessToken');
      const token2 = switchResponse1.body.accessToken;

      // Verify new token has clinic 2 as active
      const decodedToken2 = JSON.parse(
        Buffer.from(token2.split('.')[1], 'base64').toString(),
      );
      expect(decodedToken2.activeClinicId).toBe(clinic2.id);

      // Step 4: Verify token context for clinic 2
      // The token should now have clinic 2 as the active clinic
      const token2Payload = JSON.parse(
        Buffer.from(token2.split('.')[1], 'base64').toString(),
      );
      expect(token2Payload.activeClinicId).toBe(clinic2.id);

      // Step 5: Switch context to clinic 3
      const switchResponse2 = await request(context.app.getHttpServer())
        .post('/api/v1/auth/switch-context')
        .set('Authorization', `Bearer ${token2}`)
        .send({ clinicId: clinic3.id })
        .expect(200);

      const token3 = switchResponse2.body.accessToken;

      // Verify new token has clinic 3 as active
      const decodedToken3 = JSON.parse(
        Buffer.from(token3.split('.')[1], 'base64').toString(),
      );
      expect(decodedToken3.activeClinicId).toBe(clinic3.id);

      // Step 6: Verify token has correct active clinic after final switch
      const token3Payload = JSON.parse(
        Buffer.from(token3.split('.')[1], 'base64').toString(),
      );
      expect(token3Payload.activeClinicId).toBe(clinic3.id);
    });

    it('should prevent accessing clinics the user does not belong to', async () => {
      // Create two organizations
      const org1 = await context.fixtures.createOrganization({
        name: 'Org One',
        slug: 'org-one',
      });
      const org2 = await context.fixtures.createOrganization({
        name: 'Org Two',
        slug: 'org-two',
      });

      // Create clinics in each organization
      const clinic1 = await context.fixtures.createClinic(org1.id, { name: 'Clinic One' });
      const clinic2 = await context.fixtures.createClinic(org2.id, { name: 'Clinic Two' });

      // Create user with access only to clinic1
      const user = await context.fixtures.createUser({
        email: 'limited@example.com',
        password: 'Limited123!',
        name: 'Limited Access User',
        emailVerified: true,
      });
      await context.fixtures.createUserClinic(user.id, clinic1.id, 'doctor');

      // Login
      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'limited@example.com',
          password: 'Limited123!',
        })
        .expect(200);

      const token = loginResponse.body.accessToken;

      // Try to switch to clinic2 (should fail)
      const switchResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/switch-context')
        .set('Authorization', `Bearer ${token}`)
        .send({ clinicId: clinic2.id })
        .expect(400);

      expect(switchResponse.body.message).toContain('does not have access');
    });

    it('should handle login with specific clinic selection', async () => {
      // Create organization with multiple clinics
      const org = await context.fixtures.createOrganization();
      const clinic1 = await context.fixtures.createClinic(org.id, { name: 'Clinic A' });
      const clinic2 = await context.fixtures.createClinic(org.id, { name: 'Clinic B' });

      // Create user with access to both clinics
      const user = await context.fixtures.createUser({
        email: 'chooser@example.com',
        password: 'Chooser123!',
        name: 'Clinic Chooser',
        emailVerified: true,
      });
      await context.fixtures.createUserClinic(user.id, clinic1.id, 'doctor');
      await context.fixtures.createUserClinic(user.id, clinic2.id, 'secretary');

      // Login selecting clinic2 specifically
      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'chooser@example.com',
          password: 'Chooser123!',
          clinicId: clinic2.id,
        })
        .expect(200);

      // Verify active clinic is clinic2
      expect(loginResponse.body.user.activeClinic.id).toBe(clinic2.id);
      expect(loginResponse.body.user.activeClinic.role).toBe('secretary');

      // Verify token has clinic2
      const decodedToken = JSON.parse(
        Buffer.from(loginResponse.body.accessToken.split('.')[1], 'base64').toString(),
      );
      expect(decodedToken.activeClinicId).toBe(clinic2.id);
    });

    it('should maintain separate sessions for different organizations', async () => {
      // Create two separate complete setups (different organizations)
      const setup1 = await context.fixtures.createCompleteSetup();
      
      // Use unique email for second setup to avoid conflicts
      const uniqueEmail = `orgadmin2-${Date.now()}@test.com`;
      const org2 = await context.fixtures.createOrganization({
        name: 'Second Org',
        slug: `second-org-${Date.now()}`,
      });
      const clinic2 = await context.fixtures.createClinic(org2.id);
      const admin2 = await context.fixtures.createUser({
        email: uniqueEmail,
        password: TestFixtures.ORG_ADMIN.password,
        name: 'Second Org Admin',
      });
      await context.fixtures.createUserClinic(admin2.id, clinic2.id, 'admin');

      // Create a user that belongs to both organizations
      const crossOrgUser = await context.fixtures.createUser({
        email: 'crossorg@example.com',
        password: 'CrossOrg123!',
        name: 'Cross Org User',
        emailVerified: true,
      });

      // Add user to clinics in both organizations
      await context.fixtures.createUserClinic(crossOrgUser.id, setup1.clinic.id, 'doctor');
      await context.fixtures.createUserClinic(crossOrgUser.id, clinic2.id, 'doctor');

      // Login
      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'crossorg@example.com',
          password: 'CrossOrg123!',
        })
        .expect(200);

      expect(loginResponse.body.user.availableClinics).toHaveLength(2);

      const token = loginResponse.body.accessToken;

      // Switch to first org's clinic
      const switch1 = await request(context.app.getHttpServer())
        .post('/api/v1/auth/switch-context')
        .set('Authorization', `Bearer ${token}`)
        .send({ clinicId: setup1.clinic.id })
        .expect(200);

      const decoded1 = JSON.parse(
        Buffer.from(switch1.body.accessToken.split('.')[1], 'base64').toString(),
      );
      expect(decoded1.activeClinicId).toBe(setup1.clinic.id);

      // Switch to second org's clinic
      const switch2 = await request(context.app.getHttpServer())
        .post('/api/v1/auth/switch-context')
        .set('Authorization', `Bearer ${switch1.body.accessToken}`)
        .send({ clinicId: clinic2.id })
        .expect(200);

      const decoded2 = JSON.parse(
        Buffer.from(switch2.body.accessToken.split('.')[1], 'base64').toString(),
      );
      expect(decoded2.activeClinicId).toBe(clinic2.id);
    });

    it('should handle refresh token and return valid access', async () => {
      // Setup
      const setup = await context.fixtures.createCompleteSetup();

      // Login
      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        })
        .expect(200);

      const initialToken = loginResponse.body.accessToken;
      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();

      // Verify initial token has clinic context
      const decodedInitial = JSON.parse(
        Buffer.from(initialToken.split('.')[1], 'base64').toString(),
      );
      expect(decodedInitial.activeClinicId).toBe(setup.clinic.id);

      // Refresh token - API returns a new valid access token
      const refreshResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      
      // Verify the new token is valid and has clinic access
      const decodedRefreshed = JSON.parse(
        Buffer.from(refreshResponse.body.accessToken.split('.')[1], 'base64').toString(),
      );
      expect(decodedRefreshed.userId).toBe(setup.admin.id);
      expect(decodedRefreshed.clinicAccess).toBeDefined();
      expect(decodedRefreshed.clinicAccess.length).toBeGreaterThan(0);
    });

    it('should show correct available clinics after organization changes', async () => {
      // Create organization and clinics
      const org = await context.fixtures.createOrganization();
      const clinic1 = await context.fixtures.createClinic(org.id, { name: 'Clinic 1' });
      const clinic2 = await context.fixtures.createClinic(org.id, { name: 'Clinic 2' });

      // Create user with access to only clinic1 initially
      const user = await context.fixtures.createUser({
        email: 'growing@example.com',
        password: 'Growing123!',
        name: 'Growing Access User',
        emailVerified: true,
      });
      await context.fixtures.createUserClinic(user.id, clinic1.id, 'doctor');

      // Login - should see only 1 clinic
      const login1 = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'growing@example.com',
          password: 'Growing123!',
        })
        .expect(200);

      expect(login1.body.user.availableClinics).toHaveLength(1);

      // Add user to clinic2
      await context.fixtures.createUserClinic(user.id, clinic2.id, 'secretary');

      // Login again - should now see 2 clinics
      const login2 = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'growing@example.com',
          password: 'Growing123!',
        })
        .expect(200);

      expect(login2.body.user.availableClinics).toHaveLength(2);

      // Verify both clinics are listed with correct roles (API uses clinicId)
      const clinics = login2.body.user.availableClinics;
      const clinic1Data = clinics.find((c: any) => c.clinicId === clinic1.id);
      const clinic2Data = clinics.find((c: any) => c.clinicId === clinic2.id);

      expect(clinic1Data).toBeDefined();
      expect(clinic1Data.role).toBe('doctor');
      expect(clinic2Data).toBeDefined();
      expect(clinic2Data.role).toBe('secretary');
    });
  });
});

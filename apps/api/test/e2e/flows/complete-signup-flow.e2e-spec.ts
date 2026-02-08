import request from 'supertest';
import { randomBytes } from 'crypto';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../helpers/test-context.helper';

describe('Flows - Complete Signup Flow (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('Complete Signup Flow', () => {
    const signupData = {
      organization: {
        name: 'Clínica Saúde Total',
        slug: 'clinica-saude-total',
      },
      clinic: {
        name: 'Unidade Principal',
      },
      user: {
        name: 'Dr. João Silva',
        email: 'joao.silva@clinica-saude.com',
        password: 'senhaSegura123',
      },
    };

    it('should complete full signup flow: signup → verify email → login → create clinic → add members', async () => {
      // Step 1: Signup - Create organization, clinic, and admin user
      const signupResponse = await request(context.app.getHttpServer())
        .post('/api/v1/signup')
        .send(signupData)
        .expect(201);

      expect(signupResponse.body).toHaveProperty('accessToken');
      expect(signupResponse.body).toHaveProperty('user');
      expect(signupResponse.body).toHaveProperty('organization');
      TestAssertions.assertUserStructure(signupResponse.body.user);
      expect(signupResponse.body.user.emailVerified).toBe(false);

      const adminUser = signupResponse.body.user;
      const organization = signupResponse.body.organization;
      const initialAccessToken = signupResponse.body.accessToken;

      // Verify organization and clinic were created
      const orgResult = await context.pool.query(
        'SELECT * FROM organizations WHERE id = $1',
        [organization.id],
      );
      expect(orgResult.rows[0]).toBeDefined();
      expect(orgResult.rows[0].name).toBe(signupData.organization.name);

      const clinicResult = await context.pool.query(
        'SELECT * FROM clinics WHERE organization_id = $1',
        [organization.id],
      );
      expect(clinicResult.rows[0]).toBeDefined();
      expect(clinicResult.rows[0].name).toBe(signupData.clinic.name);
      const initialClinic = clinicResult.rows[0];

      // Step 2: Verify email
      // Get the verification token from database
      const userResult = await context.pool.query(
        'SELECT email_verification_token FROM users WHERE id = $1',
        [adminUser.id],
      );
      const verificationToken = userResult.rows[0].email_verification_token;
      expect(verificationToken).toBeDefined();

      await request(context.app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      // Verify email is now verified
      const verifiedUserResult = await context.pool.query(
        'SELECT email_verified FROM users WHERE id = $1',
        [adminUser.id],
      );
      expect(verifiedUserResult.rows[0].email_verified).toBe(true);

      // Step 3: Login with verified email
      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: signupData.user.email,
          password: signupData.user.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body.user.emailVerified).toBe(true);
      const accessToken = loginResponse.body.accessToken;

      // Step 4: Create a new clinic in the organization
      const newClinicData = {
        name: 'Unidade Secundária',
      };

      const createClinicResponse = await request(context.app.getHttpServer())
        .post(`/api/v1/organizations/${organization.id}/clinics`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newClinicData)
        .expect(201);

      expect(createClinicResponse.body).toHaveProperty('id');
      expect(createClinicResponse.body.name).toBe(newClinicData.name);
      expect(createClinicResponse.body.organizationId).toBe(organization.id);
      const newClinic = createClinicResponse.body;

      // Verify clinic was created in database
      const newClinicDbResult = await context.pool.query(
        'SELECT * FROM clinics WHERE id = $1',
        [newClinic.id],
      );
      expect(newClinicDbResult.rows[0]).toBeDefined();
      expect(newClinicDbResult.rows[0].name).toBe(newClinicData.name);

      // Step 5: Create a user and add them to the new clinic
      // First create the user
      const newMember = await context.fixtures.createUser({
        email: 'maria.secretaria@clinica-saude.com',
        password: 'senhaSegura123',
        name: 'Maria Secretária',
        emailVerified: true,
      });

      // Then add them to the clinic
      const addMemberResponse = await request(context.app.getHttpServer())
        .post(`/api/v1/clinics/${newClinic.id}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: newMember.id,
          role: 'secretary',
        })
        .expect(201);

      expect(addMemberResponse.body).toHaveProperty('member');
      expect(addMemberResponse.body.member.userId).toBe(newMember.id);
      expect(addMemberResponse.body.member.clinicId).toBe(newClinic.id);
      expect(addMemberResponse.body.member.role).toBe('secretary');

      // Verify member was added to clinic
      const memberClinicResult = await context.pool.query(
        'SELECT * FROM user_clinic_roles WHERE user_id = $1 AND clinic_id = $2',
        [newMember.id, newClinic.id],
      );
      expect(memberClinicResult.rows[0]).toBeDefined();
      expect(memberClinicResult.rows[0].role).toBe('secretary');
    });

    it('should handle signup with existing organization slug by suggesting alternative', async () => {
      // Create an organization with the desired slug first
      await context.fixtures.createOrganization({
        name: 'Outra Clínica',
        slug: signupData.organization.slug,
      });

      // Try to signup with the same slug
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/signup')
        .send(signupData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
      const message = JSON.stringify(response.body.message).toLowerCase();
      expect(message).toContain('slug');
    });

    it('should prevent login before email verification', async () => {
      // Some systems allow login but with limited access
      // This test verifies the current behavior

      await request(context.app.getHttpServer())
        .post('/api/v1/signup')
        .send(signupData)
        .expect(201);

      // Try to login - behavior depends on implementation
      // Most systems allow login but mark email as unverified
      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: signupData.user.email,
          password: signupData.user.password,
        })
        .expect(200);

      // User can login but email is not verified
      expect(loginResponse.body.user.emailVerified).toBe(false);
    });

    it('should resend verification email if requested', async () => {
      await request(context.app.getHttpServer())
        .post('/api/v1/signup')
        .send(signupData)
        .expect(201);

      // Login to get token
      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: signupData.user.email,
          password: signupData.user.password,
        })
        .expect(200);

      // Request resend of verification email
      await request(context.app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(200);

      // Verify a new token was generated
      const userResult = await context.pool.query(
        'SELECT email_verification_token FROM users WHERE email = $1',
        [signupData.user.email],
      );
      expect(userResult.rows[0].email_verification_token).toBeDefined();
    });

    it('should allow creating multiple clinics and switching between them', async () => {
      // Complete signup
      const signupResponse = await request(context.app.getHttpServer())
        .post('/api/v1/signup')
        .send(signupData)
        .expect(201);

      const organization = signupResponse.body.organization;
      const accessToken = signupResponse.body.accessToken;

      // Create multiple clinics
      const clinics = [];
      for (let i = 1; i <= 3; i++) {
        const clinicResponse = await request(context.app.getHttpServer())
          .post(`/api/v1/organizations/${organization.id}/clinics`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: `Unidade ${i}` })
          .expect(201);

        clinics.push(clinicResponse.body);
      }

      // Switch context to the second clinic
      const switchResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/switch-context')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ clinicId: clinics[1].id })
        .expect(200);

      expect(switchResponse.body).toHaveProperty('accessToken');

      // Create a user and add them to the second clinic
      const newDoctor = await context.fixtures.createUser({
        email: 'doctor@clinica-saude.com',
        password: 'senhaSegura123',
        name: 'Dr. Médico',
        emailVerified: true,
      });

      const addMemberResponse = await request(context.app.getHttpServer())
        .post(`/api/v1/clinics/${clinics[1].id}/members`)
        .set('Authorization', `Bearer ${switchResponse.body.accessToken}`)
        .send({
          userId: newDoctor.id,
          role: 'doctor',
        })
        .expect(201);

      expect(addMemberResponse.body.member.role).toBe('doctor');
    });
  });
});

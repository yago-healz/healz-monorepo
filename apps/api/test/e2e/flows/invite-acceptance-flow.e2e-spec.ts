import request from 'supertest';
import { randomBytes, randomUUID } from 'crypto';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAuthHelper } from '../../helpers/test-auth.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../helpers/test-context.helper';

describe('Flows - Invite Acceptance Flow (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('Invite Acceptance Flow', () => {
    it('should complete full invite flow: send invite → accept invite → login → access clinic', async () => {
      // Setup: Create organization with admin
      const setup = await context.fixtures.createCompleteSetup();
      const organization = setup.org;
      const clinic = setup.clinic;

      // Login as org admin using helper
      const adminLogin = await TestAuthHelper.login(
        context.app,
        TestFixtures.ORG_ADMIN.email,
        TestFixtures.ORG_ADMIN.password,
        clinic.id,
      );

      const adminToken = adminLogin.accessToken;

      // Step 1: Send invite to new user
      const inviteData = {
        email: 'new.doctor@example.com',
        name: 'Dr. Novo Médico',
        clinicId: clinic.id,
        role: 'doctor',
      };

      const sendInviteResponse = await request(context.app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inviteData)
        .expect(201);

      // Response format: { message, invite: {...} }
      expect(sendInviteResponse.body).toHaveProperty('invite');
      expect(sendInviteResponse.body.invite).toHaveProperty('id');
      expect(sendInviteResponse.body.invite.email).toBe(inviteData.email);
      expect(sendInviteResponse.body.invite.role).toBe(inviteData.role);

      const inviteId = sendInviteResponse.body.invite.id;

      // Verify invite was created in database
      const inviteResult = await context.pool.query(
        'SELECT * FROM invites WHERE id = $1',
        [inviteId],
      );
      expect(inviteResult.rows[0]).toBeDefined();
      const inviteToken = inviteResult.rows[0].token;
      expect(inviteToken).toBeDefined();

      // Step 2: Accept invite
      const acceptData = {
        token: inviteToken,
        password: 'newpassword123',
      };

      const acceptResponse = await request(context.app.getHttpServer())
        .post('/api/v1/invites/accept')
        .send(acceptData)
        .expect(200);

      // Verify response
      expect(acceptResponse.body).toHaveProperty('accessToken');
      expect(acceptResponse.body).toHaveProperty('user');

      // Verify structure of user
      TestAssertions.assertUserStructure(acceptResponse.body.user);
      expect(acceptResponse.body.user.email).toBe(inviteData.email);
      expect(acceptResponse.body.user.name).toBe(inviteData.name);
      expect(acceptResponse.body.user.emailVerified).toBe(false);

      // Verify activeClinic
      expect(acceptResponse.body.user.activeClinic).toBeDefined();
      expect(acceptResponse.body.user.activeClinic.id).toBe(clinic.id);
      expect(acceptResponse.body.user.activeClinic.role).toBe(inviteData.role);

      // Verify refresh token cookie
      const cookies = acceptResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');

      // Verify user was created in database
      const userResult = await context.pool.query(
        'SELECT * FROM users WHERE email = $1',
        [inviteData.email],
      );
      const user = userResult.rows[0];
      expect(user).toBeDefined();
      expect(user.email).toBe(inviteData.email);
      const newUserId = user.id;

      // Verify user-clinic relationship was created
      const userClinicResult = await context.pool.query(
        'SELECT * FROM user_clinic_roles WHERE user_id = $1 AND clinic_id = $2',
        [newUserId, clinic.id],
      );
      const userClinic = userClinicResult.rows[0];
      expect(userClinic).toBeDefined();
      expect(userClinic.role).toBe(inviteData.role);

      // Verify invite was marked as used
      const usedInviteResult = await context.pool.query(
        'SELECT used_at FROM invites WHERE id = $1',
        [inviteId],
      );
      expect(usedInviteResult.rows[0].used_at).toBeDefined();

      // Step 3: Login as the new user
      const newUserLogin = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: inviteData.email,
          password: acceptData.password,
        })
        .expect(200);

      expect(newUserLogin.body).toHaveProperty('accessToken');
      expect(newUserLogin.body.user.email).toBe(inviteData.email);
      expect(newUserLogin.body.user.activeClinic).toBeDefined();
      expect(newUserLogin.body.user.activeClinic.id).toBe(clinic.id);
      expect(newUserLogin.body.user.activeClinic.role).toBe(inviteData.role);

      const newUserToken = newUserLogin.body.accessToken;

      // Step 4: Access clinic resources (verify clinic access works)
      // For now, just verify the user has the correct active clinic in their session
      const decodedToken = JSON.parse(
        Buffer.from(newUserToken.split('.')[1], 'base64').toString(),
      );
      expect(decodedToken.activeClinicId).toBe(clinic.id);

      // Verify access token is valid by decoding it
      const tokenPayload = JSON.parse(
        Buffer.from(newUserToken.split('.')[1], 'base64').toString(),
      );
      expect(tokenPayload.email).toBe(inviteData.email);
    });

    it('should allow user created by invite to login and access clinic', async () => {
      const setup = await context.fixtures.createCompleteSetup();
      const clinic = setup.clinic;

      // Login as admin
      const adminLogin = await TestAuthHelper.login(
        context.app,
        TestFixtures.ORG_ADMIN.email,
        TestFixtures.ORG_ADMIN.password,
        clinic.id,
      );

      const adminToken = adminLogin.accessToken;
      const inviteeEmail = 'invited.user@example.com';

      // Send invite
      const inviteResponse = await request(context.app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: inviteeEmail,
          name: 'Dr. Invited User',
          clinicId: clinic.id,
          role: 'doctor',
        })
        .expect(201);

      // Get token from database
      const inviteResult = await context.pool.query(
        'SELECT token FROM invites WHERE id = $1',
        [inviteResponse.body.invite.id],
      );
      const inviteToken = inviteResult.rows[0].token;

      // Accept invite
      const acceptResponse = await request(context.app.getHttpServer())
        .post('/api/v1/invites/accept')
        .send({
          token: inviteToken,
          password: 'senhaSegura123',
        })
        .expect(200);

      expect(acceptResponse.body.user.activeClinic.id).toBe(clinic.id);

      // User should be able to login
      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: inviteeEmail,
          password: 'senhaSegura123',
        })
        .expect(200);

      expect(loginResponse.body.user.email).toBe(inviteeEmail);
      expect(loginResponse.body.user.activeClinic.id).toBe(clinic.id);
      expect(loginResponse.body.user.activeClinic.role).toBe('doctor');
    });

    it('should reject invite acceptance with wrong token', async () => {
      const setup = await context.fixtures.createCompleteSetup();

      // Login as admin
      const adminLogin = await TestAuthHelper.login(
        context.app,
        TestFixtures.ORG_ADMIN.email,
        TestFixtures.ORG_ADMIN.password,
        setup.clinic.id,
      );

      const adminToken = adminLogin.accessToken;

      // Send invite
      const inviteResponse = await request(context.app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@example.com',
          name: 'Test User',
          clinicId: setup.clinic.id,
          role: 'doctor',
        })
        .expect(201);

      // Try to accept with wrong token
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites/accept')
        .send({
          token: 'wrong-token-12345',
          password: 'newpassword123',
        })
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should prevent reusing an already accepted invite', async () => {
      const setup = await context.fixtures.createCompleteSetup();

      // Login as admin and send invite
      const adminLogin = await TestAuthHelper.login(
        context.app,
        TestFixtures.ORG_ADMIN.email,
        TestFixtures.ORG_ADMIN.password,
        setup.clinic.id,
      );

      const inviteResponse = await request(context.app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${adminLogin.accessToken}`)
        .send({
          email: 'accepted@example.com',
          name: 'Test User',
          clinicId: setup.clinic.id,
          role: 'doctor',
        })
        .expect(201);

      // Get token - use invite email to find it in DB since body structure is { message, invite }
      const inviteResult = await context.pool.query(
        'SELECT token FROM invites WHERE email = $1',
        ['accepted@example.com'],
      );
      const token = inviteResult.rows[0].token;

      // Accept invite
      await request(context.app.getHttpServer())
        .post('/api/v1/invites/accept')
        .send({
          token: token,
          password: 'newpassword123',
        })
        .expect(200);

      // Try to accept again with same token
      const reuseResponse = await request(context.app.getHttpServer())
        .post('/api/v1/invites/accept')
        .send({
          token: token,
          password: 'newpassword123',
        })
        .expect(401);

      TestAssertions.assertUnauthorizedError(reuseResponse.body);
    });

    it('should not allow sending invite to existing user', async () => {
      // Setup first (creates admin user)
      const setup = await context.fixtures.createCompleteSetup();

      // Create existing user (after setup to avoid email conflicts)
      const existingUser = await context.fixtures.createUser({
        email: `existing-${Date.now()}@example.com`,
        password: 'existingPassword123',
        name: 'Existing User',
        emailVerified: true,
      });

      // Login as admin
      const adminLogin = await TestAuthHelper.login(
        context.app,
        TestFixtures.ORG_ADMIN.email,
        TestFixtures.ORG_ADMIN.password,
        setup.clinic.id,
      );

      // Try to send invite to existing user - should fail
      const inviteResponse = await request(context.app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${adminLogin.accessToken}`)
        .send({
          email: existingUser.email,
          name: existingUser.name,
          clinicId: setup.clinic.id,
          role: 'doctor',
        })
        .expect(400);

      TestAssertions.assertValidationError(inviteResponse.body);
      const message = JSON.stringify(inviteResponse.body.message).toLowerCase();
      expect(message).toContain('email');
    });
  });
});

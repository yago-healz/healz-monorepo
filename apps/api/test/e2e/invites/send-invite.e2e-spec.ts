import request from 'supertest';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAuthHelper } from '../../helpers/test-auth.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../helpers/test-context.helper';

describe('Invites - Send Invite (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /invites', () => {
    let orgAdmin: any;
    let organization: any;
    let clinic: any;
    let adminToken: string;

    beforeEach(async () => {
      // Criar setup completo para cada teste
      const setup = await context.fixtures.createCompleteSetup();
      organization = setup.org;
      clinic = setup.clinic;
      orgAdmin = setup.admin;

      // Fazer login como admin
      const loginResult = await TestAuthHelper.login(
        context.app,
        TestFixtures.ORG_ADMIN.email,
        TestFixtures.ORG_ADMIN.password,
        clinic.id,
      );
      adminToken = loginResult.accessToken;
    });

    it('should send invite successfully when authenticated as org admin', async () => {
      const inviteData = {
        email: 'medico@example.com',
        name: 'Dr. Maria Santos',
        clinicId: clinic.id,
        role: 'doctor',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inviteData)
        .expect(201);

      // Verificar resposta
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('invite');

      // Verificar estrutura do invite
      expect(response.body.invite).toHaveProperty('id');
      expect(response.body.invite.email).toBe(inviteData.email);
      expect(response.body.invite.clinicId).toBe(inviteData.clinicId);
      expect(response.body.invite.role).toBe(inviteData.role);
      expect(response.body.invite).toHaveProperty('expiresAt');

      // Verificar que o invite foi criado no banco
      const result = await context.pool.query(
        'SELECT * FROM invites WHERE email = $1',
        [inviteData.email],
      );
      const invite = result.rows[0];
      expect(invite).toBeDefined();
      expect(invite.email).toBe(inviteData.email);
      expect(invite.name).toBe(inviteData.name);
    });

    it('should return 401 when not authenticated', async () => {
      const inviteData = {
        email: 'medico@example.com',
        name: 'Dr. Maria Santos',
        clinicId: clinic.id,
        role: 'doctor',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites')
        .send(inviteData)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 403 when authenticated user is not org admin', async () => {
      // Criar um usuário com role 'doctor' (não admin)
      const doctor = await context.fixtures.createUser({
        email: 'doctor@test.com',
        password: 'Doctor123!@#',
        name: 'Dr. John Doe',
      });
      await context.fixtures.createUserClinic(doctor.id, clinic.id, 'doctor');

      // Fazer login como doctor
      const loginResult = await TestAuthHelper.login(
        context.app,
        'doctor@test.com',
        'Doctor123!@#',
        clinic.id,
      );

      const inviteData = {
        email: 'medico@example.com',
        name: 'Dr. Maria Santos',
        clinicId: clinic.id,
        role: 'doctor',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${loginResult.accessToken}`)
        .send(inviteData)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });

    it('should return 400 when email is already registered', async () => {
      // Criar usuário com o email que vamos tentar convidar
      await context.fixtures.createUser({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      });

      const inviteData = {
        email: 'existing@example.com',
        name: 'Dr. Maria Santos',
        clinicId: clinic.id,
        role: 'doctor',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inviteData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
      const message = JSON.stringify(response.body.message).toLowerCase();
      expect(message).toContain('email');
    });

    it('should return 400 when clinic does not belong to user organization', async () => {
      // Criar outra organização e clínica
      const otherOrg = await context.fixtures.createOrganization({
        name: 'Outra Organização',
        slug: 'outra-org',
      });
      const otherClinic = await context.fixtures.createClinic(otherOrg.id, {
        name: 'Outra Clínica',
      });

      const inviteData = {
        email: 'medico@example.com',
        name: 'Dr. Maria Santos',
        clinicId: otherClinic.id, // Clínica de outra organização
        role: 'doctor',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inviteData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should return 400 for invalid role', async () => {
      const inviteData = {
        email: 'medico@example.com',
        name: 'Dr. Maria Santos',
        clinicId: clinic.id,
        role: 'invalid-role', // Role inválido
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inviteData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });
  });
});

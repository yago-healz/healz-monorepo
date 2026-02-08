import request from 'supertest';
import { randomUUID, randomBytes } from 'crypto';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../helpers/test-context.helper';

describe('Invites - Accept Invite (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /invites/accept', () => {
    let organization: any;
    let clinic: any;
    let orgAdmin: any;
    let validToken: string;
    let inviteEmail: string;

    beforeEach(async () => {
      // Criar setup completo
      const setup = await context.fixtures.createCompleteSetup();
      organization = setup.org;
      clinic = setup.clinic;
      orgAdmin = setup.admin;

      // Criar um convite válido
      inviteEmail = 'newdoctor@example.com';
      validToken = randomBytes(32).toString('hex');

      await context.pool.query(
        `INSERT INTO invites (id, email, name, clinic_id, organization_id, role, token, expires_at, invited_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          randomUUID(),
          inviteEmail,
          'Dr. New Doctor',
          clinic.id,
          organization.id,
          'doctor',
          validToken,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias no futuro
          orgAdmin.id,
        ],
      );
    });

    it('should accept invite successfully and create user account', async () => {
      const acceptData = {
        token: validToken,
        password: 'newpassword123',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites/accept')
        .send(acceptData)
        .expect(200);

      // Verificar resposta
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');

      // Verificar estrutura do usuário
      TestAssertions.assertUserStructure(response.body.user);
      expect(response.body.user.email).toBe(inviteEmail);
      expect(response.body.user.name).toBe('Dr. New Doctor');
      expect(response.body.user.emailVerified).toBe(false);

      // Verificar activeClinic
      expect(response.body.user.activeClinic).toBeDefined();
      expect(response.body.user.activeClinic.id).toBe(clinic.id);
      expect(response.body.user.activeClinic.role).toBe('doctor');

      // Verificar refresh token cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');

      // Verificar que o usuário foi criado no banco
      const userResult = await context.pool.query('SELECT * FROM users WHERE email = $1', [
        inviteEmail,
      ]);
      const user = userResult.rows[0];
      expect(user).toBeDefined();
      expect(user.email).toBe(inviteEmail);

      // Verificar que o user_clinic foi criado
      const userClinicResult = await context.pool.query(
        'SELECT * FROM user_clinic_roles WHERE user_id = $1 AND clinic_id = $2',
        [user.id, clinic.id],
      );
      const userClinic = userClinicResult.rows[0];
      expect(userClinic).toBeDefined();
      expect(userClinic.role).toBe('doctor');

      // Verificar que o convite foi marcado como usado
      const inviteResult = await context.pool.query('SELECT * FROM invites WHERE token = $1', [
        validToken,
      ]);
      const invite = inviteResult.rows[0];
      expect(invite.used_at).toBeDefined();
    });

    it('should return 400 for invalid token', async () => {
      const acceptData = {
        token: 'invalid-token-123456789',
        password: 'newpassword123',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites/accept')
        .send(acceptData)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 400 for expired token', async () => {
      // Criar convite expirado
      const expiredToken = randomBytes(32).toString('hex');
      await context.pool.query(
        `INSERT INTO invites (id, email, name, clinic_id, organization_id, role, token, expires_at, invited_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          randomUUID(),
          'expired@example.com',
          'Dr. Expired',
          clinic.id,
          organization.id,
          'doctor',
          expiredToken,
          new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia no passado (expirado)
          orgAdmin.id,
        ],
      );

      const acceptData = {
        token: expiredToken,
        password: 'newpassword123',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites/accept')
        .send(acceptData)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 400 for already accepted token', async () => {
      // Criar convite já aceito
      const acceptedToken = randomBytes(32).toString('hex');
      await context.pool.query(
        `INSERT INTO invites (id, email, name, clinic_id, organization_id, role, token, expires_at, invited_by, used_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          randomUUID(),
          'accepted@example.com',
          'Dr. Accepted',
          clinic.id,
          organization.id,
          'doctor',
          acceptedToken,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          orgAdmin.id,
        ],
      );

      const acceptData = {
        token: acceptedToken,
        password: 'newpassword123',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites/accept')
        .send(acceptData)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 400 for password shorter than 8 characters', async () => {
      const acceptData = {
        token: validToken,
        password: 'abc123', // Senha muito curta
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites/accept')
        .send(acceptData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
      const message = JSON.stringify(response.body.message).toLowerCase();
      expect(message).toContain('password');
    });

    it('should return 400 when required fields are missing', async () => {
      const acceptData = {
        // token está faltando
        password: 'newpassword123',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/invites/accept')
        .send(acceptData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });
  });
});

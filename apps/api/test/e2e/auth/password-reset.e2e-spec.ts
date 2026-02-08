import request from 'supertest';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  closeE2eTestContext,
  createE2eTestContext,
} from '../../helpers/test-context.helper';

describe('Auth - Password Reset (e2e)', () => {
  let context: E2eTestContext;

  beforeAll(async () => {
    context = await createE2eTestContext();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterAll(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /auth/forgot-password', () => {
    it('should generate reset token and send email when user exists', async () => {
      const user = await context.fixtures.createUser({
        email: 'forgot@test.com',
        password: 'Password123!@#',
        name: 'Forgot User',
      });

      await request(context.app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);

      expect(context.mailServiceMock.sendPasswordResetEmail).toHaveBeenCalledWith(
        user.email,
        expect.any(String),
      );

      const updated = await context.pool.query(
        'SELECT reset_password_token FROM users WHERE id = $1',
        [user.id],
      );
      expect(updated.rows[0].reset_password_token).not.toBeNull();
    });

    it('should respond with success even when email is not registered', async () => {
      await request(context.app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'unknown@test.com' })
        .expect(200);

      expect(context.mailServiceMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      TestAssertions.assertValidationError(response.body);
      expect(context.mailServiceMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/reset-password', () => {
    const setupUserWithClinic = async (
      overrides?: Partial<{ email: string; password: string; name: string }>,
    ) => {
      const org = await context.fixtures.createOrganization();
      const clinic = await context.fixtures.createClinic(org.id);
      const user = await context.fixtures.createUser({
        email: overrides?.email ?? TestFixtures.SECRETARY.email,
        password: overrides?.password ?? TestFixtures.SECRETARY.password,
        name: overrides?.name ?? TestFixtures.SECRETARY.name,
      });
      await context.fixtures.createUserClinic(user.id, clinic.id, 'secretary');
      return user;
    };

    it('should reset password and revoke refresh tokens for valid token', async () => {
      const token = 'reset-token-valid';
      const oldPassword = 'OldPassword123!@#';
      const user = await setupUserWithClinic({
        email: 'reset-success@test.com',
        password: oldPassword,
      });

      await context.pool.query(
        `UPDATE users SET reset_password_token = $1, reset_password_expiry = NOW() + INTERVAL '1 hour' WHERE id = $2`,
        [token, user.id],
      );

      const loginBefore = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: oldPassword })
        .expect(200);
      expect(loginBefore.body.accessToken).toBeDefined();

      await request(context.app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, newPassword: 'NewPassword123!@#' })
        .expect(200);

      const tokens = await context.pool.query('SELECT * FROM refresh_tokens');
      expect(tokens.rowCount).toBe(0);

      const userRow = await context.pool.query(
        'SELECT reset_password_token FROM users WHERE id = $1',
        [user.id],
      );
      expect(userRow.rows[0].reset_password_token).toBeNull();

      await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'NewPassword123!@#' })
        .expect(200);
    });

    it('should return 400 for invalid reset token', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'Password123!@#' })
        .expect(400);

      expect(response.body.message).toBe('Token inválido');
    });

    it('should return 400 when reset token is expired', async () => {
      const token = 'expired-reset-token';
      const user = await setupUserWithClinic({ email: 'reset-expired@test.com' });

      await context.pool.query(
        `UPDATE users SET reset_password_token = $1, reset_password_expiry = NOW() - INTERVAL '5 minutes' WHERE id = $2`,
        [token, user.id],
      );

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, newPassword: 'Password123!@#' })
        .expect(400);

      expect(response.body.message).toContain('Token expirado');
    });
  });
});

import request from 'supertest';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  closeE2eTestContext,
  createE2eTestContext,
} from '../../helpers/test-context.helper';

describe('Auth - Email Verification (e2e)', () => {
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

  describe('POST /auth/verify-email', () => {
    it('should verify email with a valid token', async () => {
      const token = 'valid-verify-token';
      const user = await context.fixtures.createUser({
        email: 'verify-success@test.com',
        password: 'Password123!@#',
        name: 'Verify Success',
        emailVerified: false,
        emailVerificationToken: token,
        emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token })
        .expect(200);

      const result = await context.pool.query(
        'SELECT email_verified, email_verification_token FROM users WHERE id = $1',
        [user.id],
      );

      expect(result.rows[0].email_verified).toBe(true);
      expect(result.rows[0].email_verification_token).toBeNull();
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: 'non-existent-token' })
        .expect(400);

      expect(response.body.message).toBe('Token inválido');
    });

    it('should return 400 when token is expired', async () => {
      const token = 'expired-token';
      await context.fixtures.createUser({
        email: 'verify-expired@test.com',
        password: 'Password123!@#',
        name: 'Verify Expired',
        emailVerified: false,
        emailVerificationToken: token,
        emailVerificationExpiry: new Date(Date.now() - 60 * 60 * 1000),
      });

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token })
        .expect(400);

      expect(response.body.message).toContain('Token expirado');
    });
  });

  describe('POST /auth/resend-verification', () => {
    const createUserWithClinic = async (
      overrides: Partial<{
        email: string;
        password: string;
        name: string;
        emailVerified: boolean;
      }> = {},
    ) => {
      const org = await context.fixtures.createOrganization();
      const clinic = await context.fixtures.createClinic(org.id);
      const user = await context.fixtures.createUser({
        email: overrides.email ?? TestFixtures.SECRETARY.email,
        password: overrides.password ?? TestFixtures.SECRETARY.password,
        name: overrides.name ?? TestFixtures.SECRETARY.name,
        emailVerified: overrides.emailVerified ?? false,
      });
      await context.fixtures.createUserClinic(user.id, clinic.id, 'secretary');
      return user;
    };

    it('should resend verification email for authenticated unverified user', async () => {
      const user = await createUserWithClinic({ emailVerified: false });

      const login = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: TestFixtures.SECRETARY.password,
        })
        .expect(200);

      await request(context.app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      expect(context.mailServiceMock.sendVerificationEmail).toHaveBeenCalledTimes(1);

      const updated = await context.pool.query(
        'SELECT email_verification_token FROM users WHERE id = $1',
        [user.id],
      );
      expect(updated.rows[0].email_verification_token).not.toBeNull();
    });

    it('should return 400 when email is already verified', async () => {
      const user = await createUserWithClinic({ emailVerified: true });

      const login = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: TestFixtures.SECRETARY.password,
        })
        .expect(200);

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
      expect(response.body.message).toBe('Email já verificado');
      expect(context.mailServiceMock.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});

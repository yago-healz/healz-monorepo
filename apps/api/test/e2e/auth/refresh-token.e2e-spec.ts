import request from 'supertest';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  closeE2eTestContext,
  createE2eTestContext,
} from '../../helpers/test-context.helper';

const getCookies = (res: request.Response): string[] => {
  const raw = res.headers['set-cookie'];
  if (!raw) {
    return [];
  }
  return Array.isArray(raw) ? raw : [raw];
};

const findRefreshCookie = (res: request.Response): string => {
  const cookies = getCookies(res);
  const refreshCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));
  if (!refreshCookie) {
    throw new Error('Refresh token cookie not found');
  }
  return refreshCookie;
};

const cookieHeaderValue = (cookie: string): string => cookie.split(';')[0];

const extractTokenValue = (cookie: string): string => cookieHeaderValue(cookie).split('=')[1];

describe('Auth - Refresh Token (e2e)', () => {
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

  describe('POST /auth/refresh', () => {
    it('should rotate refresh tokens and return new access token', async () => {
      await context.fixtures.createCompleteSetup();

      const login = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        })
        .expect(200);

      const originalCookie = findRefreshCookie(login);

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeaderValue(originalCookie))
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      const rotatedCookie = findRefreshCookie(response);
      expect(extractTokenValue(rotatedCookie)).not.toBe(extractTokenValue(originalCookie));
    });

    it('should return 401 when refresh token cookie is missing', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
      expect(response.body.message).toBe('No refresh token');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should reject reused refresh tokens', async () => {
      await context.fixtures.createCompleteSetup();
      const login = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        })
        .expect(200);

      const originalCookie = findRefreshCookie(login);

      await request(context.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeaderValue(originalCookie))
        .expect(200);

      const reuseAttempt = await request(context.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeaderValue(originalCookie))
        .expect(401);

      TestAssertions.assertUnauthorizedError(reuseAttempt.body);
      expect(reuseAttempt.body.message).toContain('Token reuse detected');
    });

    it('should return 401 for expired refresh tokens', async () => {
      await context.fixtures.createCompleteSetup();
      const login = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        })
        .expect(200);

      const originalCookie = findRefreshCookie(login);
      const tokenValue = extractTokenValue(originalCookie);

      await context.pool.query(
        `UPDATE refresh_tokens SET expires_at = NOW() - INTERVAL '1 minute' WHERE token = $1`,
        [tokenValue],
      );

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeaderValue(originalCookie))
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
      expect(response.body.message).toBe('Refresh token expired');
    });
  });
});

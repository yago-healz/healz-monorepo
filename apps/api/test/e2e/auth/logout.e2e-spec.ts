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
    throw new Error('Refresh token cookie not set');
  }
  return refreshCookie;
};

const cookieHeaderValue = (cookie: string): string => cookie.split(';')[0];

describe('Auth - Logout (e2e)', () => {
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

  describe('POST /auth/logout', () => {
    it('should revoke refresh tokens and clear cookie on logout', async () => {
      await context.fixtures.createCompleteSetup();
      const login = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        })
        .expect(200);

      const refreshCookie = findRefreshCookie(login);

      const logoutResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .set('Cookie', cookieHeaderValue(refreshCookie))
        .expect(204);

      const clearedCookie = getCookies(logoutResponse).find((cookie) =>
        cookie.startsWith('refreshToken='),
      );
      expect(clearedCookie).toBeDefined();
      expect(clearedCookie).toContain('refreshToken=');
      expect(clearedCookie).toContain('Expires=');

      const tokens = await context.pool.query('SELECT * FROM refresh_tokens');
      expect(tokens.rowCount).toBe(0);
    });

    it('should succeed even without refresh cookie', async () => {
      await context.fixtures.createCompleteSetup();
      const login = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        })
        .expect(200);

      await request(context.app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(204);
    });

    it('should return 401 without access token', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });
  });
});

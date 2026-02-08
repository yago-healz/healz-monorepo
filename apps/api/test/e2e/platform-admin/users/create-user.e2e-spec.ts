import request from 'supertest';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Create User (e2e)', () => {
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

  describe('POST /platform-admin/users', () => {
    it('should return 201 and create user with invite', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      
      const createData = {
        name: 'New Doctor',
        email: 'newdoctor@example.com',
        clinicId: clinic.id,
        role: 'doctor',
        sendInvite: true,
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'New Doctor');
      expect(response.body).toHaveProperty('email', 'newdoctor@example.com');
      expect(response.body).toHaveProperty('status', 'active');
      expect(response.body).toHaveProperty('emailVerified', false);
    });

    it('should return 201 and create user with password without invite', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      
      const createData = {
        name: 'New Secretary',
        email: 'newsecretary@example.com',
        clinicId: clinic.id,
        role: 'secretary',
        sendInvite: false,
        password: 'TempPass123!',
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'New Secretary');
      expect(response.body).toHaveProperty('email', 'newsecretary@example.com');
      expect(response.body).toHaveProperty('status', 'active');
    });

    it('should return 400 for duplicate email', async () => {
      const { org, clinic } = await context.fixtures.createCompleteSetup();
      
      // Create first user
      await context.fixtures.createUser({
        email: 'duplicate@example.com',
        password: 'User123!@#',
        name: 'Existing User',
      });

      // Try to create with same email
      const createData = {
        name: 'New User',
        email: 'duplicate@example.com',
        clinicId: clinic.id,
        role: 'doctor',
        sendInvite: true,
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createData)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('já existe');
    });

    it('should return 400 for invalid data', async () => {
      const { clinic } = await context.fixtures.createCompleteSetup();
      
      const invalidData = {
        name: 'A', // Too short
        email: 'invalid-email',
        clinicId: clinic.id,
        role: 'invalid-role',
        sendInvite: false,
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should return 401 without authentication token', async () => {
      const { clinic } = await context.fixtures.createCompleteSetup();
      
      const createData = {
        name: 'Test User',
        email: 'test@example.com',
        clinicId: clinic.id,
        role: 'doctor',
        sendInvite: true,
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/users')
        .send(createData)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 403 for non-platform-admin user', async () => {
      const { clinic } = await context.fixtures.createCompleteSetup();
      
      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        });

      const userToken = loginResponse.body.accessToken;

      const createData = {
        name: 'Test User',
        email: 'test@example.com',
        clinicId: clinic.id,
        role: 'doctor',
        sendInvite: true,
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createData)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

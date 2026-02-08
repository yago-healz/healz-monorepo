import request from 'supertest';
import { TestFixtures } from '../../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../../helpers/test-context.helper';

describe('Platform Admin - Create Organization (e2e)', () => {
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

  describe('POST /platform-admin/organizations', () => {
    it('should return 201 and create organization with clinic and admin', async () => {
      const createData = {
        name: 'New Organization',
        slug: 'new-organization',
        initialClinic: {
          name: 'Main Clinic',
        },
        initialAdmin: {
          name: 'John Doe',
          email: 'john@neworg.com',
          sendInvite: false,
        },
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createData)
        .expect(201);

      expect(response.body).toHaveProperty('organization');
      expect(response.body).toHaveProperty('clinic');
      expect(response.body).toHaveProperty('admin');
      expect(response.body).toHaveProperty('invite');

      // Verify organization
      expect(response.body.organization).toHaveProperty('id');
      expect(response.body.organization).toHaveProperty('name', 'New Organization');
      expect(response.body.organization).toHaveProperty('slug', 'new-organization');
      expect(response.body.organization).toHaveProperty('status', 'active');

      // Verify clinic
      expect(response.body.clinic).toHaveProperty('id');
      expect(response.body.clinic).toHaveProperty('name', 'Main Clinic');

      // Verify admin
      expect(response.body.admin).toHaveProperty('id');
      expect(response.body.admin).toHaveProperty('email', 'john@neworg.com');
      expect(response.body.admin).toHaveProperty('name', 'John Doe');

      // Verify no invite was sent
      expect(response.body.invite).toBeNull();
      expect(context.mailServiceMock.sendInviteEmail).not.toHaveBeenCalled();
    });

    it('should return 201 without sending invite when sendInvite is false', async () => {
      const createData = {
        name: 'No Invite Org',
        slug: 'no-invite-org',
        initialClinic: {
          name: 'Main Clinic',
        },
        initialAdmin: {
          name: 'Jane Doe',
          email: 'jane@noinvite.com',
          sendInvite: false,
        },
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createData)
        .expect(201);

      expect(response.body.organization).toHaveProperty('name', 'No Invite Org');
      expect(response.body.invite).toBeNull();
      expect(context.mailServiceMock.sendInviteEmail).not.toHaveBeenCalled();
    });

    it('should return 400 for duplicate slug', async () => {
      // Create first organization
      await context.fixtures.createOrganization({
        name: 'Existing Org',
        slug: 'duplicate-slug',
      });

      // Try to create with same slug
      const createData = {
        name: 'New Organization',
        slug: 'duplicate-slug',
        initialClinic: {
          name: 'Main Clinic',
        },
        initialAdmin: {
          name: 'John Doe',
          email: 'john@test.com',
          sendInvite: false,
        },
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createData)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('Slug já existe');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        name: 'A', // Too short
        slug: 'ab', // Too short
        initialClinic: {
          name: '', // Empty
        },
        initialAdmin: {
          name: '',
          email: 'invalid-email',
        },
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should return 401 without authentication token', async () => {
      const createData = {
        name: 'Test Org',
        slug: 'test-org',
        initialClinic: {
          name: 'Main Clinic',
        },
        initialAdmin: {
          name: 'John Doe',
          email: 'john@test.com',
          sendInvite: false,
        },
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/organizations')
        .send(createData)
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 403 for non-platform-admin user', async () => {
      // Create regular user with clinic association
      const { clinic } = await context.fixtures.createCompleteSetup();
      const user = await context.fixtures.createUser({
        email: 'user@test.com',
        password: 'User123!@#',
        name: 'Regular User',
      });
      await context.fixtures.createUserClinic(user.id, clinic.id, 'doctor');

      const loginResponse = await request(context.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'user@test.com',
          password: 'User123!@#',
        });

      const userToken = loginResponse.body.accessToken;

      const createData = {
        name: 'Test Org',
        slug: 'test-org',
        initialClinic: {
          name: 'Main Clinic',
        },
        initialAdmin: {
          name: 'John Doe',
          email: 'john@test.com',
          sendInvite: false,
        },
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/platform-admin/organizations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createData)
        .expect(403);

      TestAssertions.assertForbiddenError(response.body);
    });
  });
});

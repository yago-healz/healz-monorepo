import request from 'supertest';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';
import {
  E2eTestContext,
  createE2eTestContext,
  closeE2eTestContext,
} from '../../helpers/test-context.helper';

describe('Signup (e2e)', () => {
  let context: E2eTestContext;

  beforeEach(async () => {
    context = await createE2eTestContext();
    jest.clearAllMocks();
    await context.dbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await closeE2eTestContext(context);
  });

  describe('POST /signup', () => {
    const validSignupData = {
      organization: {
        name: 'Clínica Teste',
        slug: 'clinica-teste',
      },
      clinic: {
        name: 'Unidade Principal',
      },
      user: {
        name: 'Dr. João Silva',
        email: 'joao@clinica-teste.com',
        password: 'senha12345',
      },
    };

    it('should create organization, clinic, admin user and return access token', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/api/v1/signup')
        .send(validSignupData)
        .expect(201);

      // Verificar resposta
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('organization');

      // Verificar estrutura do usuário
      TestAssertions.assertUserStructure(response.body.user);
      expect(response.body.user.email).toBe(validSignupData.user.email);
      expect(response.body.user.name).toBe(validSignupData.user.name);
      expect(response.body.user.emailVerified).toBe(false);

      // Verificar activeClinic
      expect(response.body.user.activeClinic).toBeDefined();
      expect(response.body.user.activeClinic.name).toBe(validSignupData.clinic.name);
      expect(response.body.user.activeClinic.role).toBe('admin');

      // Verificar organização
      expect(response.body.organization).toHaveProperty('id');
      expect(response.body.organization).toHaveProperty('name');
      expect(response.body.organization).toHaveProperty('slug');
      expect(response.body.organization.name).toBe(validSignupData.organization.name);
      expect(response.body.organization.slug).toBe(validSignupData.organization.slug);

      // Verificar refresh token cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');

      // Verificar que os dados foram criados no banco
      const result = await context.pool.query(
        'SELECT * FROM organizations WHERE slug = $1',
        [validSignupData.organization.slug],
      );
      const org = result.rows[0];
      expect(org).toBeDefined();
      expect(org.name).toBe(validSignupData.organization.name);
    });

    it('should return 400 for duplicate email', async () => {
      // Criar usuário com o email que vamos tentar usar
      await context.fixtures.createUser({
        email: validSignupData.user.email,
        password: 'outra-senha',
        name: 'Outro Usuário',
      });

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/signup')
        .send(validSignupData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
      const message = JSON.stringify(response.body.message).toLowerCase();
      expect(message).toContain('email');
    });

    it('should return 400 for duplicate organization slug', async () => {
      // Criar organização com o slug que vamos tentar usar
      await context.fixtures.createOrganization({
        name: 'Outra Organização',
        slug: validSignupData.organization.slug,
      });

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/signup')
        .send(validSignupData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
      const message = JSON.stringify(response.body.message).toLowerCase();
      expect(message).toContain('slug');
    });

    it('should return 400 for invalid organization slug format', async () => {
      const invalidData = {
        ...validSignupData,
        organization: {
          ...validSignupData.organization,
          slug: 'Clinica Teste', // Slug com espaços e maiúsculas (inválido)
        },
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/signup')
        .send(invalidData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
      const message = JSON.stringify(response.body.message).toLowerCase();
      expect(message).toContain('slug');
    });

    it('should return 400 for password shorter than 8 characters', async () => {
      const invalidData = {
        ...validSignupData,
        user: {
          ...validSignupData.user,
          password: 'abc123', // Senha com menos de 8 caracteres
        },
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/signup')
        .send(invalidData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
      const message = JSON.stringify(response.body.message).toLowerCase();
      expect(message).toContain('password');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = {
        ...validSignupData,
        user: {
          ...validSignupData.user,
          email: 'invalid-email-format',
        },
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/signup')
        .send(invalidData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
      const message = JSON.stringify(response.body.message).toLowerCase();
      expect(message).toContain('email');
    });

    it('should return 400 when required fields are missing', async () => {
      const invalidData = {
        organization: {
          name: 'Clínica Teste',
          // slug está faltando
        },
        clinic: {
          name: 'Unidade Principal',
        },
        user: {
          name: 'Dr. João Silva',
          email: 'joao@clinica-teste.com',
          password: 'senha12345',
        },
      };

      const response = await request(context.app.getHttpServer())
        .post('/api/v1/signup')
        .send(invalidData)
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });
  });
});

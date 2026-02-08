# Plano de Implementação de Testes E2E Automatizados

## 📋 Visão Geral

Este documento descreve o plano completo para implementar testes End-to-End (E2E) automatizados na API NestJS do Healz, seguindo as melhores práticas de testes E2E.

**Objetivo:** Testar todos os fluxos da API como se fosse o cliente consumindo os endpoints, garantindo que o sistema funciona corretamente em cenários reais.

---

## 🗺️ Mapeamento Completo de Endpoints

### 1. Health Check (Público)
- `GET /health` - Verificar status da API

### 2. Authentication (`/auth`)
- `POST /auth/login` - Login de usuário
- `POST /auth/switch-context` - Trocar contexto de clínica (autenticado)
- `POST /auth/refresh` - Renovar access token
- `POST /auth/logout` - Logout do usuário (autenticado)
- `POST /auth/verify-email` - Verificar email
- `POST /auth/resend-verification` - Reenviar email de verificação (autenticado)
- `POST /auth/forgot-password` - Solicitar reset de senha
- `POST /auth/reset-password` - Resetar senha

### 3. Signup (`/signup`)
- `POST /signup` - Criar nova organização (B2B signup)

### 4. Organizations (`/organizations`)
- `POST /organizations/:organizationId/clinics` - Criar nova clínica (autenticado, admin org)

### 5. Clinics (`/clinics`)
- `POST /clinics/:clinicId/members` - Adicionar membro à clínica (autenticado, admin clínica)

### 6. Invites (`/invites`)
- `POST /invites` - Enviar convite para novo usuário (autenticado, admin org)
- `POST /invites/accept` - Aceitar convite

### 7. Platform Admin - Organizations (`/platform-admin/organizations`)
- `GET /platform-admin/organizations` - Listar organizações (admin plataforma)
- `GET /platform-admin/organizations/:id` - Ver detalhes da organização (admin plataforma)
- `POST /platform-admin/organizations` - Criar organização manualmente (admin plataforma)
- `PATCH /platform-admin/organizations/:id` - Editar organização (admin plataforma)
- `PATCH /platform-admin/organizations/:id/status` - Ativar/Desativar organização (admin plataforma)

### 8. Platform Admin - Clinics (`/platform-admin/clinics`)
- `GET /platform-admin/clinics` - Listar clínicas (admin plataforma)
- `GET /platform-admin/clinics/:id` - Ver detalhes da clínica (admin plataforma)
- `POST /platform-admin/clinics` - Criar clínica (admin plataforma)
- `PATCH /platform-admin/clinics/:id` - Editar clínica (admin plataforma)
- `PATCH /platform-admin/clinics/:id/transfer` - Transferir clínica para outra organização (admin plataforma)
- `PATCH /platform-admin/clinics/:id/status` - Ativar/Desativar clínica (admin plataforma)

### 9. Platform Admin - Users (`/platform-admin/users`)
- `GET /platform-admin/users` - Listar usuários (admin plataforma)
- `GET /platform-admin/users/:id` - Ver detalhes do usuário (admin plataforma)
- `POST /platform-admin/users` - Criar usuário (admin plataforma)
- `PATCH /platform-admin/users/:id` - Editar usuário (admin plataforma)
- `POST /platform-admin/users/:id/reset-password` - Resetar senha do usuário (admin plataforma)
- `POST /platform-admin/users/:id/verify-email` - Forçar verificação de email (admin plataforma)
- `PATCH /platform-admin/users/:id/status` - Ativar/Desativar usuário (admin plataforma)
- `POST /platform-admin/users/:userId/clinics` - Adicionar usuário a clínica (admin plataforma)
- `PATCH /platform-admin/users/:userId/clinics/:clinicId` - Atualizar role do usuário na clínica (admin plataforma)
- `DELETE /platform-admin/users/:userId/clinics/:clinicId` - Remover usuário da clínica (admin plataforma)

### 10. Platform Admin - Support (`/platform-admin/users`)
- `POST /platform-admin/users/:id/impersonate` - Impersonar usuário (admin plataforma)
- `POST /platform-admin/users/:id/revoke-sessions` - Revogar todas as sessões do usuário (admin plataforma)

### 11. Platform Admin - Admins (`/platform-admin/admins`)
- `GET /platform-admin/admins` - Listar platform admins (admin plataforma)
- `POST /platform-admin/admins` - Criar novo platform admin (admin plataforma)
- `DELETE /platform-admin/admins/:id` - Revogar permissões de platform admin (admin plataforma)

**Total: 43 endpoints**

---

## 🏗️ Estrutura do Projeto de Testes

```
apps/api/
├── test/
│   ├── e2e/
│   │   ├── health/
│   │   │   └── health.e2e-spec.ts
│   │   ├── auth/
│   │   │   ├── login.e2e-spec.ts
│   │   │   ├── switch-context.e2e-spec.ts
│   │   │   ├── refresh-token.e2e-spec.ts
│   │   │   ├── logout.e2e-spec.ts
│   │   │   ├── email-verification.e2e-spec.ts
│   │   │   └── password-reset.e2e-spec.ts
│   │   ├── signup/
│   │   │   └── signup.e2e-spec.ts
│   │   ├── organizations/
│   │   │   └── create-clinic.e2e-spec.ts
│   │   ├── clinics/
│   │   │   └── add-member.e2e-spec.ts
│   │   ├── invites/
│   │   │   ├── send-invite.e2e-spec.ts
│   │   │   └── accept-invite.e2e-spec.ts
│   │   ├── platform-admin/
│   │   │   ├── organizations/
│   │   │   │   ├── list-organizations.e2e-spec.ts
│   │   │   │   ├── get-organization.e2e-spec.ts
│   │   │   │   ├── create-organization.e2e-spec.ts
│   │   │   │   ├── update-organization.e2e-spec.ts
│   │   │   │   └── organization-status.e2e-spec.ts
│   │   │   ├── clinics/
│   │   │   │   ├── list-clinics.e2e-spec.ts
│   │   │   │   ├── get-clinic.e2e-spec.ts
│   │   │   │   ├── create-clinic.e2e-spec.ts
│   │   │   │   ├── update-clinic.e2e-spec.ts
│   │   │   │   ├── transfer-clinic.e2e-spec.ts
│   │   │   │   └── clinic-status.e2e-spec.ts
│   │   │   ├── users/
│   │   │   │   ├── list-users.e2e-spec.ts
│   │   │   │   ├── get-user.e2e-spec.ts
│   │   │   │   ├── create-user.e2e-spec.ts
│   │   │   │   ├── update-user.e2e-spec.ts
│   │   │   │   ├── user-password.e2e-spec.ts
│   │   │   │   ├── user-status.e2e-spec.ts
│   │   │   │   └── user-clinics.e2e-spec.ts
│   │   │   ├── support/
│   │   │   │   ├── impersonate.e2e-spec.ts
│   │   │   │   └── revoke-sessions.e2e-spec.ts
│   │   │   └── admins/
│   │   │       ├── list-admins.e2e-spec.ts
│   │   │       ├── create-admin.e2e-spec.ts
│   │   │       └── revoke-admin.e2e-spec.ts
│   │   └── flows/
│   │       ├── complete-signup-flow.e2e-spec.ts
│   │       ├── invite-acceptance-flow.e2e-spec.ts
│   │       └── multi-tenant-flow.e2e-spec.ts
│   ├── helpers/
│   │   ├── test-database.helper.ts
│   │   ├── test-fixtures.helper.ts
│   │   ├── test-auth.helper.ts
│   │   ├── test-utils.helper.ts
│   │   └── test-assertions.helper.ts
│   ├── setup/
│   │   ├── global-setup.ts
│   │   └── global-teardown.ts
│   └── config/
│       └── jest-e2e.json
├── docker-compose.test.yml
└── .env.test
```

---

## 🐳 Setup do Ambiente de Testes

### 1. Docker Compose para Banco de Dados de Teste

**Arquivo: `apps/api/docker-compose.test.yml`**

```yaml
version: '3.8'

services:
  postgres-test:
    image: postgres:16-alpine
    container_name: healz-test-db
    environment:
      POSTGRES_DB: healz_test
      POSTGRES_USER: healz_test
      POSTGRES_PASSWORD: healz_test_password
    ports:
      - '5433:5432'
    volumes:
      - postgres-test-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U healz_test']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres-test-data:
```

### 2. Variáveis de Ambiente de Teste

**Arquivo: `apps/api/.env.test`**

```bash
# Database
DATABASE_URL=postgresql://healz_test:healz_test_password@localhost:5433/healz_test
DB_HOST=localhost
DB_PORT=5433
DB_NAME=healz_test
DB_USERNAME=healz_test
DB_PASSWORD=healz_test_password

# Environment
NODE_ENV=test

# JWT
JWT_SECRET=test-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=test-jwt-refresh-secret-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Email (Mock)
RESEND_API_KEY=re_test_key
MAIL_FROM=noreply@healz.test

# Throttler (Disabled in tests)
THROTTLE_TTL=1000
THROTTLE_LIMIT=1000
```

### 3. Configuração do Jest para E2E

**Arquivo: `apps/api/test/config/jest-e2e.json`**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "../..",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": [
    "src/**/*.{ts,js}",
    "!src/**/*.spec.ts",
    "!src/**/*.e2e-spec.ts",
    "!src/main.ts"
  ],
  "coverageDirectory": "../../coverage/e2e",
  "testTimeout": 30000,
  "setupFilesAfterEnv": ["<rootDir>/test/setup/global-setup.ts"],
  "globalTeardown": "<rootDir>/test/setup/global-teardown.ts",
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/src/$1"
  },
  "verbose": true,
  "forceExit": true,
  "detectOpenHandles": true
}
```

### 4. Scripts NPM

**Adicionar no `apps/api/package.json`:**

```json
{
  "scripts": {
    "test:e2e": "NODE_ENV=test jest --config test/config/jest-e2e.json",
    "test:e2e:watch": "NODE_ENV=test jest --config test/config/jest-e2e.json --watch",
    "test:e2e:cov": "NODE_ENV=test jest --config test/config/jest-e2e.json --coverage",
    "test:e2e:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand --config test/config/jest-e2e.json",
    "test:db:up": "docker-compose -f docker-compose.test.yml up -d",
    "test:db:down": "docker-compose -f docker-compose.test.yml down -v",
    "test:db:reset": "pnpm test:db:down && pnpm test:db:up && sleep 5 && pnpm db:push"
  }
}
```

### 5. Dependências Necessárias

```bash
pnpm add -D @nestjs/testing supertest @types/supertest
```

---

## 🛠️ Helpers e Utilities

### 1. Database Helper

**Arquivo: `test/helpers/test-database.helper.ts`**

```typescript
import { DataSource } from 'typeorm';

export class TestDatabaseHelper {
  constructor(private dataSource: DataSource) {}

  /**
   * Limpa todas as tabelas do banco de dados
   */
  async cleanDatabase(): Promise<void> {
    const tables = [
      'platform_admins',
      'audit_logs',
      'refresh_tokens',
      'user_clinics',
      'clinics',
      'organizations',
      'users',
    ];

    for (const table of tables) {
      await this.dataSource.query(`TRUNCATE TABLE "${table}" CASCADE`);
    }
  }

  /**
   * Reseta as sequences do banco
   */
  async resetSequences(): Promise<void> {
    const sequences = await this.dataSource.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);

    for (const { sequence_name } of sequences) {
      await this.dataSource.query(`ALTER SEQUENCE ${sequence_name} RESTART WITH 1`);
    }
  }

  /**
   * Executa seed de dados de teste
   */
  async seedTestData(): Promise<void> {
    // Implementar seeds conforme necessário
  }
}
```

### 2. Auth Helper

**Arquivo: `test/helpers/test-auth.helper.ts`**

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: any;
}

export class TestAuthHelper {
  /**
   * Realiza login e retorna tokens
   */
  static async login(
    app: INestApplication,
    email: string,
    password: string,
    clinicId?: string,
  ): Promise<LoginResult> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password, clinicId })
      .expect(200);

    const cookies = response.headers['set-cookie'];
    const refreshToken = cookies
      ? cookies[0].split(';')[0].split('=')[1]
      : '';

    return {
      accessToken: response.body.accessToken,
      refreshToken,
      user: response.body.user,
    };
  }

  /**
   * Cria um usuário e faz login automaticamente
   */
  static async createUserAndLogin(
    app: INestApplication,
    userData: {
      email: string;
      password: string;
      name: string;
      organizationId?: string;
      clinicId?: string;
      role?: string;
    },
  ): Promise<LoginResult> {
    // Implementar criação de usuário no banco
    // Depois fazer login
    return this.login(app, userData.email, userData.password);
  }

  /**
   * Cria um platform admin e faz login
   */
  static async createPlatformAdminAndLogin(
    app: INestApplication,
    email: string = 'admin@healz.com',
    password: string = 'Admin123!@#',
  ): Promise<LoginResult> {
    // Implementar criação de platform admin
    return this.login(app, email, password);
  }

  /**
   * Cria um admin de organização e faz login
   */
  static async createOrgAdminAndLogin(
    app: INestApplication,
    organizationId: string,
  ): Promise<LoginResult> {
    // Implementar
    return {} as LoginResult;
  }

  /**
   * Cria header de autenticação
   */
  static authHeader(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }
}
```

### 3. Fixtures Helper

**Arquivo: `test/helpers/test-fixtures.helper.ts`**

```typescript
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

export class TestFixtures {
  // Default fixtures
  static readonly PLATFORM_ADMIN = {
    email: 'admin@healz.com',
    password: 'Admin123!@#',
    name: 'Platform Admin',
  };

  static readonly ORG_ADMIN = {
    email: 'orgadmin@test.com',
    password: 'OrgAdmin123!@#',
    name: 'Organization Admin',
  };

  static readonly DOCTOR = {
    email: 'doctor@test.com',
    password: 'Doctor123!@#',
    name: 'Dr. John Doe',
  };

  static readonly SECRETARY = {
    email: 'secretary@test.com',
    password: 'Secretary123!@#',
    name: 'Jane Secretary',
  };

  static readonly ORGANIZATION = {
    name: 'Test Organization',
    slug: 'test-org',
  };

  static readonly CLINIC = {
    name: 'Test Clinic',
    address: '123 Test St',
    city: 'Test City',
  };

  constructor(private dataSource: DataSource) {}

  /**
   * Cria uma organização de teste
   */
  async createOrganization(data?: Partial<typeof TestFixtures.ORGANIZATION>) {
    const orgData = { ...TestFixtures.ORGANIZATION, ...data };
    const [org] = await this.dataSource.query(
      `INSERT INTO organizations (id, name, slug, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [nanoid(), orgData.name, orgData.slug, 'active'],
    );
    return org;
  }

  /**
   * Cria uma clínica de teste
   */
  async createClinic(organizationId: string, data?: Partial<typeof TestFixtures.CLINIC>) {
    const clinicData = { ...TestFixtures.CLINIC, ...data };
    const [clinic] = await this.dataSource.query(
      `INSERT INTO clinics (id, name, "organizationId", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [nanoid(), clinicData.name, organizationId, 'active'],
    );
    return clinic;
  }

  /**
   * Cria um usuário de teste
   */
  async createUser(
    data: Partial<typeof TestFixtures.DOCTOR> & { email: string; password: string },
  ) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [user] = await this.dataSource.query(
      `INSERT INTO users (id, email, "passwordHash", name, "emailVerified", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [nanoid(), data.email, passwordHash, data.name || 'Test User', true, 'active'],
    );
    return user;
  }

  /**
   * Cria uma relação usuário-clínica
   */
  async createUserClinic(userId: string, clinicId: string, role: string = 'admin') {
    const [userClinic] = await this.dataSource.query(
      `INSERT INTO user_clinics ("userId", "clinicId", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [userId, clinicId, role],
    );
    return userClinic;
  }

  /**
   * Cria um platform admin
   */
  async createPlatformAdmin(
    data: Partial<typeof TestFixtures.PLATFORM_ADMIN> = TestFixtures.PLATFORM_ADMIN,
  ) {
    const user = await this.createUser(data as any);
    await this.dataSource.query(
      `INSERT INTO platform_admins ("userId", "createdAt", "updatedAt")
       VALUES ($1, NOW(), NOW())`,
      [user.id],
    );
    return user;
  }

  /**
   * Cria setup completo: org + clinic + admin
   */
  async createCompleteSetup() {
    const org = await this.createOrganization();
    const clinic = await this.createClinic(org.id);
    const admin = await this.createUser(TestFixtures.ORG_ADMIN);
    await this.createUserClinic(admin.id, clinic.id, 'admin');

    return { org, clinic, admin };
  }
}
```

### 4. Assertions Helper

**Arquivo: `test/helpers/test-assertions.helper.ts`**

```typescript
export class TestAssertions {
  /**
   * Verifica estrutura de resposta de lista paginada
   */
  static assertPaginatedResponse(body: any) {
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toHaveProperty('page');
    expect(body.pagination).toHaveProperty('limit');
    expect(body.pagination).toHaveProperty('total');
    expect(body.pagination).toHaveProperty('totalPages');
  }

  /**
   * Verifica estrutura de user object
   */
  static assertUserStructure(user: any) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('emailVerified');
    expect(user).not.toHaveProperty('passwordHash');
  }

  /**
   * Verifica estrutura de organization object
   */
  static assertOrganizationStructure(org: any) {
    expect(org).toHaveProperty('id');
    expect(org).toHaveProperty('name');
    expect(org).toHaveProperty('slug');
    expect(org).toHaveProperty('status');
  }

  /**
   * Verifica estrutura de clinic object
   */
  static assertClinicStructure(clinic: any) {
    expect(clinic).toHaveProperty('id');
    expect(clinic).toHaveProperty('name');
    expect(clinic).toHaveProperty('organizationId');
    expect(clinic).toHaveProperty('status');
  }

  /**
   * Verifica erro de validação
   */
  static assertValidationError(body: any) {
    expect(body).toHaveProperty('statusCode');
    expect(body.statusCode).toBe(400);
    expect(body).toHaveProperty('message');
  }

  /**
   * Verifica erro de autenticação
   */
  static assertUnauthorizedError(body: any) {
    expect(body).toHaveProperty('statusCode');
    expect(body.statusCode).toBe(401);
  }

  /**
   * Verifica erro de permissão
   */
  static assertForbiddenError(body: any) {
    expect(body).toHaveProperty('statusCode');
    expect(body.statusCode).toBe(403);
  }
}
```

---

## 📝 Exemplo de Teste E2E Completo

**Arquivo: `test/e2e/auth/login.e2e-spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../../../src/app.module';
import { DataSource } from 'typeorm';
import { TestDatabaseHelper } from '../../helpers/test-database.helper';
import { TestFixtures } from '../../helpers/test-fixtures.helper';
import { TestAssertions } from '../../helpers/test-assertions.helper';

describe('Auth - Login (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let dbHelper: TestDatabaseHelper;
  let fixtures: TestFixtures;

  beforeAll(async () => {
    // Criar módulo de teste
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configurar app como no main.ts
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.use(cookieParser());

    await app.init();

    // Obter conexão com banco
    dataSource = app.get(DataSource);
    dbHelper = new TestDatabaseHelper(dataSource);
    fixtures = new TestFixtures(dataSource);
  });

  beforeEach(async () => {
    // Limpar banco antes de cada teste
    await dbHelper.cleanDatabase();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should return 200 and tokens for valid credentials', async () => {
      // Arrange: Criar organização, clínica e usuário
      const { org, clinic, admin } = await fixtures.createCompleteSetup();

      // Act: Fazer login
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: TestFixtures.ORG_ADMIN.password,
        })
        .expect(200);

      // Assert: Verificar resposta
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      TestAssertions.assertUserStructure(response.body.user);
      expect(response.body.user.email).toBe(TestFixtures.ORG_ADMIN.email);

      // Verificar refresh token cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('should return 401 for invalid password', async () => {
      // Arrange
      const { admin } = await fixtures.createCompleteSetup();

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.ORG_ADMIN.email,
          password: 'wrong-password',
        })
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'any-password',
        })
        .expect(401);

      TestAssertions.assertUnauthorizedError(response.body);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'any-password',
        })
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
        })
        .expect(400);

      TestAssertions.assertValidationError(response.body);
    });

    it('should allow login with specific clinicId', async () => {
      // Arrange: Criar usuário com múltiplas clínicas
      const org = await fixtures.createOrganization();
      const clinic1 = await fixtures.createClinic(org.id, { name: 'Clinic 1' });
      const clinic2 = await fixtures.createClinic(org.id, { name: 'Clinic 2' });
      const user = await fixtures.createUser(TestFixtures.DOCTOR);
      await fixtures.createUserClinic(user.id, clinic1.id, 'doctor');
      await fixtures.createUserClinic(user.id, clinic2.id, 'doctor');

      // Act: Login com clinicId específico
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TestFixtures.DOCTOR.email,
          password: TestFixtures.DOCTOR.password,
          clinicId: clinic2.id,
        })
        .expect(200);

      // Assert: Verificar que activeClinic é clinic2
      expect(response.body.user.activeClinic.id).toBe(clinic2.id);
      expect(response.body.user.availableClinics).toHaveLength(2);
    });
  });
});
```

---

## 🚀 Plano de Implementação por Fases

### **Fase 1: Setup Inicial (Prioridade: Alta)**
**Estimativa: 1 dia**

- [ ] Criar estrutura de pastas `test/`
- [ ] Configurar Docker Compose para banco de teste
- [ ] Criar arquivo `.env.test`
- [ ] Configurar `jest-e2e.json`
- [ ] Adicionar scripts NPM
- [ ] Testar setup básico com teste do `/health`

**Entregáveis:**
- Docker Compose rodando
- Primeiro teste E2E passando
- Scripts funcionando

---

### **Fase 2: Helpers e Utilities (Prioridade: Alta)**
**Estimativa: 1 dia**

- [ ] Implementar `test-database.helper.ts`
- [ ] Implementar `test-auth.helper.ts`
- [ ] Implementar `test-fixtures.helper.ts`
- [ ] Implementar `test-assertions.helper.ts`
- [ ] Criar global setup e teardown

**Entregáveis:**
- Todos os helpers funcionais
- Fixtures de dados de teste
- Database cleanup funcionando

---

### **Fase 3: Testes de Autenticação (Prioridade: Alta)**
**Estimativa: 2 dias**

- [ ] Implementar `login.e2e-spec.ts` (5 cenários)
- [ ] Implementar `switch-context.e2e-spec.ts` (4 cenários)
- [ ] Implementar `refresh-token.e2e-spec.ts` (5 cenários)
- [ ] Implementar `logout.e2e-spec.ts` (3 cenários)
- [ ] Implementar `email-verification.e2e-spec.ts` (4 cenários)
- [ ] Implementar `password-reset.e2e-spec.ts` (6 cenários)

**Cenários Totais: ~27 testes**

**Entregáveis:**
- Todos os endpoints de `/auth` testados
- Cobertura de casos de sucesso e falha
- Testes de rate limiting

---

### **Fase 4: Testes de Signup e Invites (Prioridade: Alta)**
**Estimativa: 1,5 dias**

- [ ] Implementar `signup.e2e-spec.ts` (7 cenários)
- [ ] Implementar `send-invite.e2e-spec.ts` (5 cenários)
- [ ] Implementar `accept-invite.e2e-spec.ts` (6 cenários)

**Cenários Totais: ~18 testes**

**Entregáveis:**
- Fluxo de signup completo testado
- Sistema de convites testado

---

### **Fase 5: Testes de Organizations e Clinics (Prioridade: Média)**
**Estimativa: 1 dia**

- [ ] Implementar `create-clinic.e2e-spec.ts` (Organizations) (5 cenários)
- [ ] Implementar `add-member.e2e-spec.ts` (Clinics) (5 cenários)

**Cenários Totais: ~10 testes**

**Entregáveis:**
- Endpoints regulares de organizations/clinics testados

---

### **Fase 6: Testes Platform Admin - Organizations (Prioridade: Média)**
**Estimativa: 2 dias**

- [ ] Implementar `list-organizations.e2e-spec.ts` (6 cenários)
- [ ] Implementar `get-organization.e2e-spec.ts` (4 cenários)
- [ ] Implementar `create-organization.e2e-spec.ts` (6 cenários)
- [ ] Implementar `update-organization.e2e-spec.ts` (5 cenários)
- [ ] Implementar `organization-status.e2e-spec.ts` (5 cenários)

**Cenários Totais: ~26 testes**

**Entregáveis:**
- Todos os endpoints de Platform Admin Organizations testados
- Verificação de permissões (401, 403)

---

### **Fase 7: Testes Platform Admin - Clinics (Prioridade: Média)**
**Estimativa: 2 dias**

- [ ] Implementar `list-clinics.e2e-spec.ts` (6 cenários)
- [ ] Implementar `get-clinic.e2e-spec.ts` (4 cenários)
- [ ] Implementar `create-clinic.e2e-spec.ts` (5 cenários)
- [ ] Implementar `update-clinic.e2e-spec.ts` (5 cenários)
- [ ] Implementar `transfer-clinic.e2e-spec.ts` (6 cenários)
- [ ] Implementar `clinic-status.e2e-spec.ts` (5 cenários)

**Cenários Totais: ~31 testes**

**Entregáveis:**
- Todos os endpoints de Platform Admin Clinics testados
- Transferência de clínicas testada

---

### **Fase 8: Testes Platform Admin - Users (Prioridade: Média)**
**Estimativa: 2,5 dias**

- [ ] Implementar `list-users.e2e-spec.ts` (6 cenários)
- [ ] Implementar `get-user.e2e-spec.ts` (4 cenários)
- [ ] Implementar `create-user.e2e-spec.ts` (6 cenários)
- [ ] Implementar `update-user.e2e-spec.ts` (5 cenários)
- [ ] Implementar `user-password.e2e-spec.ts` (4 cenários)
- [ ] Implementar `user-status.e2e-spec.ts` (5 cenários)
- [ ] Implementar `user-clinics.e2e-spec.ts` (8 cenários: add, update, remove)

**Cenários Totais: ~38 testes**

**Entregáveis:**
- Todos os endpoints de Platform Admin Users testados
- Gestão de clínicas de usuários testada

---

### **Fase 9: Testes Platform Admin - Support & Admins (Prioridade: Baixa)**
**Estimativa: 1,5 dias**

- [ ] Implementar `impersonate.e2e-spec.ts` (5 cenários)
- [ ] Implementar `revoke-sessions.e2e-spec.ts` (4 cenários)
- [ ] Implementar `list-admins.e2e-spec.ts` (3 cenários)
- [ ] Implementar `create-admin.e2e-spec.ts` (5 cenários)
- [ ] Implementar `revoke-admin.e2e-spec.ts` (4 cenários)

**Cenários Totais: ~21 testes**

**Entregáveis:**
- Funcionalidades de suporte testadas
- Gestão de platform admins testada

---

### **Fase 10: Testes de Fluxos Completos (Prioridade: Alta)**
**Estimativa: 2 dias**

- [ ] Implementar `complete-signup-flow.e2e-spec.ts`
  - Signup → Email verification → Login → Create clinic → Add members
- [ ] Implementar `invite-acceptance-flow.e2e-spec.ts`
  - Send invite → Accept invite → Login → Access clinic
- [ ] Implementar `multi-tenant-flow.e2e-spec.ts`
  - Login → Access clinic 1 → Switch context → Access clinic 2

**Cenários Totais: ~15 testes (fluxos end-to-end)**

**Entregáveis:**
- Fluxos completos de usuário testados
- Integração entre módulos verificada

---

### **Fase 11: Documentação e CI/CD (Prioridade: Média)**
**Estimativa: 1 dia**

- [ ] Documentar como rodar os testes
- [ ] Criar README para pasta de testes
- [ ] Configurar CI/CD (GitHub Actions ou similar)
- [ ] Adicionar badges de cobertura
- [ ] Revisar e refatorar código de testes

**Entregáveis:**
- Documentação completa
- Pipeline de CI/CD funcionando
- Relatório de cobertura

---

## 📊 Resumo de Estimativas

| Fase | Descrição | Dias | Testes Estimados |
|------|-----------|------|------------------|
| 1 | Setup Inicial | 1 | 1 |
| 2 | Helpers e Utilities | 1 | 0 |
| 3 | Autenticação | 2 | 27 |
| 4 | Signup e Invites | 1.5 | 18 |
| 5 | Organizations/Clinics | 1 | 10 |
| 6 | Platform Admin - Organizations | 2 | 26 |
| 7 | Platform Admin - Clinics | 2 | 31 |
| 8 | Platform Admin - Users | 2.5 | 38 |
| 9 | Platform Admin - Support/Admins | 1.5 | 21 |
| 10 | Fluxos Completos | 2 | 15 |
| 11 | Documentação e CI/CD | 1 | 0 |
| **TOTAL** | | **17,5 dias** | **~187 testes** |

---

## ✅ Checklist de Boas Práticas

### Estrutura de Testes
- [ ] Usar `describe` para agrupar testes relacionados
- [ ] Usar `it` com descrições claras do comportamento esperado
- [ ] Um cenário por teste (single responsibility)
- [ ] Seguir padrão AAA (Arrange, Act, Assert)

### Database
- [ ] Usar banco de teste separado
- [ ] Limpar dados entre testes (`beforeEach`)
- [ ] Não usar mocks para banco (usar banco real)
- [ ] Seeds de dados consistentes

### Autenticação
- [ ] Testar endpoints protegidos sem token (401)
- [ ] Testar endpoints com token inválido (401)
- [ ] Testar endpoints sem permissão (403)
- [ ] Testar diferentes níveis de permissão

### Assertions
- [ ] Verificar status code
- [ ] Verificar estrutura da resposta
- [ ] Verificar tipos de dados
- [ ] Não expor dados sensíveis (passwords, tokens internos)

### Performance
- [ ] Inicializar app no `beforeAll`, não `beforeEach`
- [ ] Reusar conexões quando possível
- [ ] Usar transações para testes que não precisam commit

### Manutenibilidade
- [ ] Usar helpers para código repetitivo
- [ ] Usar fixtures para dados de teste
- [ ] Documentar casos de teste complexos
- [ ] Manter testes independentes entre si

---

## 🔍 Critérios de Aceitação

### Para Cada Teste
- ✅ Passa consistentemente (não flaky)
- ✅ Executa em menos de 5 segundos
- ✅ Tem descrição clara do cenário
- ✅ Testa apenas um comportamento
- ✅ Limpa dados após execução

### Para Cada Endpoint
- ✅ Teste de sucesso (happy path)
- ✅ Teste de validação (campos obrigatórios, formatos)
- ✅ Teste de autenticação (401 sem token)
- ✅ Teste de autorização (403 sem permissão)
- ✅ Teste de não encontrado (404 se aplicável)
- ✅ Teste de conflito (409 se aplicável)

### Para o Projeto
- ✅ Todos os 43 endpoints cobertos
- ✅ Cobertura mínima de 80%
- ✅ Documentação completa
- ✅ CI/CD configurado
- ✅ Testes executando em menos de 5 minutos

---

## 📚 Referências

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)

---

## 🎯 Próximos Passos

1. **Revisar este plano** com a equipe
2. **Aprovar escopo e prioridades**
3. **Iniciar Fase 1: Setup Inicial**
4. **Executar fases sequencialmente**
5. **Revisar e ajustar conforme necessário**

---

**Documento criado em:** 2026-02-08
**Última atualização:** 2026-02-08
**Status:** 🟡 Aguardando Aprovação

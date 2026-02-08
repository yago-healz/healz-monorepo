# Testes E2E - Healz API

Este diretório contém os testes End-to-End (E2E) automatizados da API Healz.

## 📋 Estrutura

```
test/
├── config/
│   └── jest-e2e.json          # Configuração do Jest para E2E
├── setup/
│   ├── global-setup.ts        # Setup executado antes de todos os testes
│   └── global-teardown.ts     # Teardown executado após todos os testes
├── helpers/
│   ├── test-database.helper.ts    # Helper para operações no banco de dados
│   ├── test-auth.helper.ts        # Helper para autenticação
│   ├── test-fixtures.helper.ts    # Helper para criar fixtures de teste
│   └── test-assertions.helper.ts  # Helper para assertions comuns
└── e2e/
    └── health/
        └── health.e2e-spec.ts     # Teste do endpoint /health
```

## 🚀 Como Usar

### 1. Iniciar o Banco de Dados de Teste

```bash
pnpm test:db:up
```

Isso iniciará um container Docker com PostgreSQL na porta 5433.

### 2. Executar Migrations no Banco de Teste

```bash
pnpm test:db:reset
```

Isso irá:
- Parar o container (se estiver rodando)
- Iniciar um novo container limpo
- Aguardar 5 segundos para o banco inicializar
- Executar o `db:push` com as variáveis de ambiente de teste

### 3. Executar os Testes

```bash
# Executar todos os testes E2E
pnpm test:e2e

# Executar em modo watch (re-executa ao salvar arquivos)
pnpm test:e2e:watch

# Executar com cobertura de código
pnpm test:e2e:cov

# Executar em modo debug
pnpm test:e2e:debug
```

### 4. Parar o Banco de Dados de Teste

```bash
pnpm test:db:down
```

Isso irá parar e remover o container e os volumes.

## 🔧 Configuração

### Variáveis de Ambiente

As variáveis de ambiente de teste estão no arquivo `.env.test`:

```bash
DATABASE_URL=postgresql://healz_test:healz_test_password@localhost:5433/healz_test
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-change-in-production
# ... outras variáveis
```

### Jest Configuration

A configuração do Jest está em `test/config/jest-e2e.json`:

- **Timeout:** 30 segundos por teste
- **Test Pattern:** `.e2e-spec.ts$`
- **Coverage:** Coleta de todos os arquivos `src/**/*.ts` (exceto testes)
- **Force Exit:** Encerra após todos os testes
- **Detect Open Handles:** Detecta conexões abertas

## 📝 Como Escrever Testes

### Exemplo Básico

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../src/app.module';
import { DataSource } from 'typeorm';
import { TestDatabaseHelper } from '../../helpers/test-database.helper';
import { TestFixtures } from '../../helpers/test-fixtures.helper';

describe('Feature Name (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let dbHelper: TestDatabaseHelper;
  let fixtures: TestFixtures;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

    dataSource = app.get(DataSource);
    dbHelper = new TestDatabaseHelper(dataSource);
    fixtures = new TestFixtures(dataSource);
  });

  beforeEach(async () => {
    await dbHelper.cleanDatabase();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('POST /api/v1/endpoint', () => {
    it('should do something', async () => {
      // Arrange
      const { org, clinic, admin } = await fixtures.createCompleteSetup();

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/endpoint')
        .send({ data: 'test' })
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('id');
    });
  });
});
```

## 🛠️ Helpers Disponíveis

### TestDatabaseHelper

```typescript
const dbHelper = new TestDatabaseHelper(dataSource);

// Limpar todas as tabelas
await dbHelper.cleanDatabase();

// Resetar sequences
await dbHelper.resetSequences();
```

### TestFixtures

```typescript
const fixtures = new TestFixtures(dataSource);

// Criar organização
const org = await fixtures.createOrganization();

// Criar clínica
const clinic = await fixtures.createClinic(org.id);

// Criar usuário
const user = await fixtures.createUser({
  email: 'test@example.com',
  password: 'Password123!',
  name: 'Test User',
});

// Criar setup completo (org + clinic + admin)
const { org, clinic, admin } = await fixtures.createCompleteSetup();

// Criar platform admin
const platformAdmin = await fixtures.createPlatformAdmin();
```

### TestAuthHelper

```typescript
// Fazer login
const { accessToken, user } = await TestAuthHelper.login(
  app,
  'user@example.com',
  'password',
);

// Criar header de autenticação
const headers = TestAuthHelper.authHeader(accessToken);

// Usar em requisições
await request(app.getHttpServer())
  .get('/api/v1/protected-endpoint')
  .set(headers)
  .expect(200);
```

### TestAssertions

```typescript
// Verificar resposta paginada
TestAssertions.assertPaginatedResponse(response.body);

// Verificar estrutura de usuário
TestAssertions.assertUserStructure(user);

// Verificar estrutura de organização
TestAssertions.assertOrganizationStructure(org);

// Verificar erros
TestAssertions.assertValidationError(response.body);
TestAssertions.assertUnauthorizedError(response.body);
TestAssertions.assertForbiddenError(response.body);
```

## ✅ Boas Práticas

1. **Limpar o banco entre testes:** Use `beforeEach` para limpar o banco
2. **Usar fixtures:** Crie dados de teste usando os helpers
3. **Padrão AAA:** Organize testes em Arrange, Act, Assert
4. **Descrições claras:** Use descrições que explicam o comportamento esperado
5. **Um cenário por teste:** Cada teste deve testar apenas um comportamento
6. **Independência:** Testes não devem depender da ordem de execução

## 📊 Status Atual

### Fase 1: Setup Inicial ✅
- [x] Estrutura de pastas criada
- [x] Docker Compose configurado
- [x] Arquivo `.env.test` criado
- [x] Configuração do Jest (jest-e2e.json)
- [x] Scripts NPM adicionados
- [x] Primeiro teste E2E passando (health check)

### Fase 2: Helpers e Utilities ✅
- [x] TestDatabaseHelper implementado
- [x] TestAuthHelper implementado
- [x] TestFixtures implementado
- [x] TestAssertions implementado
- [x] Global setup e teardown criados

## 🐛 Problemas Encontrados e Soluções

### 1. Imports de TypeScript
**Problema:** Erros de compilação com `import * as request from 'supertest'`

**Solução:** Usar default imports: `import request from 'supertest'`

### 2. Endpoint 404
**Problema:** Teste retornava 404 para `/health`

**Solução:** Endpoint correto é `/api/v1/health` (com prefixo global)

### 3. Docker Compose Command
**Problema:** `docker-compose` não encontrado

**Solução:** Usar `docker compose` (sem hífen, versão mais recente)

## 🔜 Próximos Passos

- **Fase 3:** Implementar testes de autenticação (login, refresh, logout, etc.)
- **Fase 4:** Implementar testes de signup e invites
- **Fase 5:** Implementar testes de organizations e clinics
- **Fase 6-9:** Implementar testes de Platform Admin
- **Fase 10:** Implementar testes de fluxos completos

## 📚 Referências

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest](https://github.com/visionmedia/supertest)
- [Jest](https://jestjs.io/)

# Plano: Testes Automatizados de Autenticação

## Contexto

Não existem testes na API. O foco aqui são **testes essenciais** que cobrem os fluxos críticos de autenticação: login, refresh, switch-context, logout e guards. Usaremos testes de integração (E2E) com banco real de testes, pois testam o fluxo completo de forma mais confiável que mocks unitários.

## Arquivos a Criar/Alterar

- `apps/api/package.json` — dependências de teste
- `apps/api/jest.config.ts` — configuração do Jest
- `apps/api/test/setup.ts` — setup global (banco de teste, seed)
- `apps/api/test/helpers.ts` — helpers compartilhados
- `apps/api/test/auth.e2e-spec.ts` — testes E2E de auth

## Passos

### 1. Instalar dependências

```bash
cd apps/api
pnpm add -D supertest @types/supertest
```

As dependências `jest`, `ts-jest` e `@nestjs/testing` já existem.

### 2. Criar configuração do Jest

**Criar `apps/api/jest.config.ts`:**

```typescript
import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.e2e-spec\\.ts$",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  testEnvironment: "node",
  setupFilesAfterSetup: ["./test/setup.ts"],
  // Timeout maior para E2E (banco, HTTP, etc.)
  testTimeout: 30000,
};

export default config;
```

### 3. Criar setup de teste

O setup inicializa o app NestJS e cria dados de seed no banco de teste.

**Pré-requisito**: ter um banco de dados de teste. Usar a variável `DATABASE_URL` apontando para um banco separado (ex: `healz_test`).

**Criar `apps/api/test/setup.ts`:**

```typescript
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as cookieParser from "cookie-parser";
import { sql } from "drizzle-orm";
import { AppModule } from "../src/app.module";
import { db } from "../src/db";
import {
  clinics,
  organizations,
  refreshTokens,
  userClinicRoles,
  users,
} from "../src/db/schema";
import * as bcrypt from "bcrypt";

export let app: INestApplication;

// Dados de seed para testes
export const TEST_USER = {
  email: "test@healz.com",
  password: "TestPass123!",
  name: "Test User",
};

export const TEST_ORG = {
  name: "Test Organization",
  slug: "test-org",
};

export const TEST_CLINIC = {
  name: "Test Clinic",
};

// IDs gerados no seed (preenchidos no beforeAll)
export let testUserId: string;
export let testOrgId: string;
export let testClinicId: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.enableCors({ credentials: true });
  await app.init();

  // Limpar banco e criar seed
  await cleanDatabase();
  await seedDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await app.close();
});

async function cleanDatabase() {
  // Ordem importa por causa das foreign keys
  await db.delete(refreshTokens);
  await db.delete(userClinicRoles);
  await db.delete(users);
  await db.delete(clinics);
  await db.delete(organizations);
}

async function seedDatabase() {
  // Criar organização
  const [org] = await db
    .insert(organizations)
    .values(TEST_ORG)
    .returning({ id: organizations.id });
  testOrgId = org.id;

  // Criar clínica
  const [clinic] = await db
    .insert(clinics)
    .values({ ...TEST_CLINIC, organizationId: testOrgId })
    .returning({ id: clinics.id });
  testClinicId = clinic.id;

  // Criar usuário
  const passwordHash = await bcrypt.hash(TEST_USER.password, 10);
  const [user] = await db
    .insert(users)
    .values({
      email: TEST_USER.email,
      passwordHash,
      name: TEST_USER.name,
    })
    .returning({ id: users.id });
  testUserId = user.id;

  // Associar usuário à clínica
  await db.insert(userClinicRoles).values({
    userId: testUserId,
    clinicId: testClinicId,
    role: "admin",
  });
}
```

**Nota sobre `cookie-parser`**: o controller usa `request.cookies`, então é necessário:

```bash
cd apps/api
pnpm add cookie-parser
pnpm add -D @types/cookie-parser
```

E em `main.ts` (se não estiver já), adicionar `app.use(cookieParser())`. Verificar se já está presente.

### 4. Criar helpers de teste

**Criar `apps/api/test/helpers.ts`:**

```typescript
import * as request from "supertest";
import { app, TEST_USER } from "./setup";

/**
 * Faz login e retorna accessToken e cookies (com refreshToken)
 */
export async function loginAndGetTokens(
  email = TEST_USER.email,
  password = TEST_USER.password,
) {
  const response = await request(app.getHttpServer())
    .post("/auth/login")
    .send({ email, password });

  const cookies = response.headers["set-cookie"] || [];
  const accessToken = response.body.accessToken;

  return { accessToken, cookies, response };
}

/**
 * Extrai refresh token do header set-cookie
 */
export function extractRefreshToken(cookies: string[]): string | undefined {
  const refreshCookie = cookies.find((c: string) => c.startsWith("refreshToken="));
  if (!refreshCookie) return undefined;
  return refreshCookie.split(";")[0].split("=")[1];
}
```

### 5. Criar testes E2E

**Criar `apps/api/test/auth.e2e-spec.ts`:**

```typescript
import * as request from "supertest";
import { app, TEST_USER, testClinicId } from "./setup";
import { loginAndGetTokens, extractRefreshToken } from "./helpers";

describe("Auth (E2E)", () => {
  // ── LOGIN ──────────────────────────────────────────────

  describe("POST /auth/login", () => {
    it("deve retornar 200 com accessToken e cookie refreshToken", async () => {
      const { response } = await loginAndGetTokens();

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(TEST_USER.email);
      expect(response.body.user.activeClinic).toBeDefined();
      expect(response.headers["set-cookie"]).toBeDefined();
    });

    it("deve retornar 401 com senha incorreta", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: TEST_USER.email, password: "wrong-password" });

      expect(response.status).toBe(401);
    });

    it("deve retornar 401 com email inexistente", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "naoexiste@healz.com", password: "qualquer" });

      expect(response.status).toBe(401);
    });

    it("deve retornar 400 com body inválido (sem email)", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ password: "qualquer" });

      expect(response.status).toBe(400);
    });
  });

  // ── REFRESH ────────────────────────────────────────────

  describe("POST /auth/refresh", () => {
    it("deve retornar novo accessToken com refresh token válido", async () => {
      const { cookies } = await loginAndGetTokens();

      const response = await request(app.getHttpServer())
        .post("/auth/refresh")
        .set("Cookie", cookies);

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
    });

    it("deve retornar 401 sem refresh token", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/refresh");

      expect(response.status).toBe(401);
    });

    it("deve retornar 401 com refresh token inválido", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/refresh")
        .set("Cookie", ["refreshToken=token-invalido"]);

      expect(response.status).toBe(401);
    });
  });

  // ── SWITCH CONTEXT ─────────────────────────────────────

  describe("POST /auth/switch-context", () => {
    it("deve retornar novo accessToken ao trocar de clínica", async () => {
      const { accessToken } = await loginAndGetTokens();

      const response = await request(app.getHttpServer())
        .post("/auth/switch-context")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ clinicId: testClinicId });

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toBeDefined();
    });

    it("deve retornar 400 para clínica sem acesso", async () => {
      const { accessToken } = await loginAndGetTokens();

      const response = await request(app.getHttpServer())
        .post("/auth/switch-context")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ clinicId: "00000000-0000-0000-0000-000000000000" });

      expect(response.status).toBe(400);
    });

    it("deve retornar 401 sem token de autenticação", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/switch-context")
        .send({ clinicId: testClinicId });

      expect(response.status).toBe(401);
    });
  });

  // ── LOGOUT ─────────────────────────────────────────────

  describe("POST /auth/logout", () => {
    it("deve retornar 204 e invalidar refresh token", async () => {
      const { accessToken, cookies } = await loginAndGetTokens();

      // Logout
      const logoutResponse = await request(app.getHttpServer())
        .post("/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Cookie", cookies);

      expect(logoutResponse.status).toBe(204);

      // Tentar usar o refresh token antigo deve falhar
      const refreshResponse = await request(app.getHttpServer())
        .post("/auth/refresh")
        .set("Cookie", cookies);

      expect(refreshResponse.status).toBe(401);
    });

    it("deve retornar 401 sem autenticação", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/logout");

      expect(response.status).toBe(401);
    });
  });

  // ── PROTECTED ENDPOINTS ────────────────────────────────

  describe("Guards", () => {
    it("deve rejeitar request sem Bearer token em endpoint protegido", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/switch-context")
        .send({ clinicId: testClinicId });

      expect(response.status).toBe(401);
    });

    it("deve rejeitar Bearer token expirado/inválido", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/switch-context")
        .set("Authorization", "Bearer token-invalido")
        .send({ clinicId: testClinicId });

      expect(response.status).toBe(401);
    });
  });
});
```

### 6. Adicionar script de teste no `package.json`

**Em `apps/api/package.json`**, adicionar/atualizar scripts:

```json
{
  "scripts": {
    "test": "jest",
    "test:e2e": "jest --config jest.config.ts",
    "test:e2e:watch": "jest --config jest.config.ts --watch"
  }
}
```

### 7. Configurar banco de teste

Criar um `.env.test` ou usar variável de ambiente ao rodar os testes:

```bash
# Opção 1: .env.test
DATABASE_URL=postgresql://healz:healz_dev@localhost:5432/healz_test

# Opção 2: inline
DATABASE_URL=postgresql://healz:healz_dev@localhost:5432/healz_test pnpm test:e2e
```

Criar o banco de teste:

```bash
createdb healz_test -U healz
# Aplicar migrations no banco de teste
DATABASE_URL=postgresql://healz:healz_dev@localhost:5432/healz_test pnpm drizzle-kit migrate
```

### 8. Executar testes

```bash
cd apps/api
pnpm test:e2e
```

## Testes Cobertos (Resumo)

| Fluxo | Cenário | Status Esperado |
|-------|---------|-----------------|
| Login | Credenciais válidas | 200 + token |
| Login | Senha incorreta | 401 |
| Login | Email inexistente | 401 |
| Login | Body inválido | 400 |
| Refresh | Token válido | 200 + novo token |
| Refresh | Sem token | 401 |
| Refresh | Token inválido | 401 |
| Switch | Clínica com acesso | 201 + novo token |
| Switch | Clínica sem acesso | 400 |
| Switch | Sem autenticação | 401 |
| Logout | Autenticado | 204 + invalida refresh |
| Logout | Sem autenticação | 401 |
| Guards | Sem Bearer token | 401 |
| Guards | Token inválido | 401 |

**Total: 14 testes essenciais** cobrindo os fluxos críticos de autenticação.

## Resultado Esperado

- Suite de testes E2E rodando contra banco de teste real
- Cobertura dos fluxos críticos: login, refresh, switch-context, logout
- Testes de guards (rejeição de requests não autenticados)
- Setup automatizado com seed de dados
- Pode ser executado em CI/CD

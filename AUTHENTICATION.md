# Análise de Autenticação e Multi-Tenant - Healz Platform

## Visão Geral

A implementação atual representa uma **solução robusta e bem arquitetada** de autenticação e multi-tenancy usando NestJS + JWT + Drizzle ORM. O sistema foi projetado para suportar múltiplas clínicas (tenants) com isolamento adequado de dados e controle de acesso baseado em funções.

### Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION LAYER                    │
├─────────────────────────────────────────────────────────────┤
│  JWT Strategy (Passport)                                    │
│  ├─ Access Token (15min)                                    │
│  └─ Refresh Token (7 dias, httpOnly cookie)                │
├─────────────────────────────────────────────────────────────┤
│  Guards                                                      │
│  ├─ JwtAuthGuard (Bearer Token)                            │
│  └─ RolesGuard (admin, doctor, secretary)                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    MULTI-TENANCY LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  Organizations (tenants principais)                         │
│    └─ Clinics (unidades de tenant)                         │
│         └─ Users (com roles por clínica)                   │
├─────────────────────────────────────────────────────────────┤
│  RLS Middleware (Row-Level Security)                        │
│  ├─ PostgreSQL Session Variables                           │
│  ├─ Isolamento automático por organização                  │
│  └─ Proteção contra queries cross-tenant                   │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Pontos Fortes da Implementação

### 1. Segurança Robusta

#### Autenticação
- ✅ **Bcrypt para passwords** - Algoritmo adequado e amplamente testado
- ✅ **JWT com expiração curta** (15min) - Reduz janela de ataque
- ✅ **Refresh tokens persistidos** - Permite revogação granular
- ✅ **httpOnly cookies** - Protege contra XSS
- ✅ **SameSite=strict** - Proteção contra CSRF
- ✅ **Secure flag em produção** - HTTPS enforcement

#### Multi-Tenancy
- ✅ **Row-Level Security (RLS)** via PostgreSQL session variables - Excelente escolha!
  - Proteção em nível de banco de dados
  - Impossível esquecer de filtrar por tenant em queries
  - Performance otimizada pelo PostgreSQL
- ✅ **Cleanup de contexto** - Previne context leakage entre requests

### 2. Arquitetura Limpa

- ✅ **Separação de responsabilidades** clara (Module → Service → Controller → Guard)
- ✅ **Decoradores customizados** (`@CurrentUser`, `@Roles`) - DRY principle
- ✅ **DTOs com validação** - Type safety e input validation
- ✅ **Interfaces bem definidas** - JwtPayload estruturado
- ✅ **Drizzle ORM** - Type-safe queries, previne SQL injection

### 3. Flexibilidade Multi-Tenant

- ✅ **Multi-clinic support** - Usuários podem ter acesso a várias clínicas
- ✅ **Context switching** - Troca de clínica sem re-login
- ✅ **Roles por clínica** - Permissões granulares (pode ser admin em uma, doctor em outra)
- ✅ **Modelo Organizations → Clinics** - Permite hierarquia organizacional

### 4. Developer Experience

- ✅ **Código bem organizado** - Fácil navegar e manter
- ✅ **Environment-based config** - Flexível entre ambientes
- ✅ **Error handling consistente** - Não vaza informações sensíveis
- ✅ **CORS configurável** - Seguro e flexível

---

## ⚠️ Pontos de Atenção e Melhorias

### 1. **Segurança - CRÍTICO**

#### 🔴 JWT_SECRET em Environment Variable
**Problema**: Secret em variável de ambiente é arriscado em produção.

**Risco**:
- Logs podem expor o secret
- Containers/pods podem vazar variáveis
- Rotação de secrets é complexa

**Solução Recomendada**:
```typescript
// Usar secret manager (AWS Secrets Manager, GCP Secret Manager, Vault)
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function getJwtSecret(): Promise<string> {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: 'healz/jwt-secret' })
  );
  return JSON.parse(response.SecretString).jwt_secret;
}
```

**Alternativa Simples** (se não usar cloud):
```typescript
// Ler de arquivo protegido (não versionado)
import { readFileSync } from 'fs';
const JWT_SECRET = readFileSync('/etc/secrets/jwt-secret', 'utf8').trim();
```

#### 🟡 Refresh Token Rotation
**Problema**: Refresh tokens não são rotacionados após uso.

**Risco**: Se um refresh token vazar, pode ser usado até expirar (7 dias).

**Solução**:
```typescript
// Em auth.service.ts - método refresh()
async refresh(refreshToken: string) {
  // 1. Validar token antigo
  const oldToken = await this.validateRefreshToken(refreshToken);

  // 2. Deletar token antigo
  await db.delete(refreshTokensTable).where(eq(refreshTokensTable.token, refreshToken));

  // 3. Gerar novo refresh token
  const newRefreshToken = crypto.randomBytes(64).toString('hex');
  await db.insert(refreshTokensTable).values({
    userId: oldToken.userId,
    token: newRefreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // 4. Retornar novo access + refresh token
  return { accessToken, refreshToken: newRefreshToken };
}
```

#### 🟡 Rate Limiting
**Problema**: Sem proteção contra brute force em `/auth/login`.

**Solução**:
```typescript
// Instalar: npm install @nestjs/throttler

// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minuto
      limit: 5,   // 5 tentativas
    }]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})

// auth.controller.ts
@Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 tentativas por minuto
@Post('login')
async login(@Body() loginDto: LoginDto) { ... }
```

#### 🟡 Password Requirements
**Problema**: Não há validação de força de senha.

**Solução**:
```typescript
// Adicionar em DTOs
import { Matches } from 'class-validator';

export class RegisterDto {
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Senha deve ter mínimo 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial',
  })
  password: string;
}
```

### 2. **Funcionalidades Faltantes**

#### 🟡 Auditoria de Acessos
**Necessidade**: Rastrear quem acessou o quê e quando.

**Implementação**:
```typescript
// Criar tabela de audit logs
export const auditLogsTable = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => usersTable.id),
  action: varchar('action', { length: 100 }), // 'login', 'switch_context', 'access_patient'
  resource: varchar('resource', { length: 255 }), // '/api/patients/123'
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  organizationId: uuid('organization_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Criar interceptor
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Log ação
    this.auditService.log({
      userId: user?.userId,
      action: `${request.method} ${request.url}`,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return next.handle();
  }
}
```

#### 🟡 Email Verification
**Necessidade**: Validar emails antes de permitir acesso completo.

**Implementação**:
```typescript
// Adicionar campo em users
export const usersTable = pgTable('users', {
  // ... campos existentes
  emailVerified: boolean('email_verified').default(false),
  verificationToken: varchar('verification_token', { length: 255 }),
  verificationTokenExpiry: timestamp('verification_token_expiry'),
});

// Endpoint de verificação
@Post('verify-email')
async verifyEmail(@Body() { token }: VerifyEmailDto) {
  await this.authService.verifyEmail(token);
  return { message: 'Email verificado com sucesso' };
}
```

#### 🟡 Password Reset
**Necessidade**: Recuperação de senha segura.

**Implementação**:
```typescript
// Adicionar em users
export const usersTable = pgTable('users', {
  // ... campos existentes
  resetPasswordToken: varchar('reset_password_token', { length: 255 }),
  resetPasswordExpiry: timestamp('reset_password_expiry'),
});

// Endpoints
@Post('forgot-password')
async forgotPassword(@Body() { email }: ForgotPasswordDto) {
  await this.authService.sendPasswordResetEmail(email);
  return { message: 'Se o email existir, você receberá instruções' };
}

@Post('reset-password')
async resetPassword(@Body() dto: ResetPasswordDto) {
  await this.authService.resetPassword(dto.token, dto.newPassword);
  return { message: 'Senha alterada com sucesso' };
}
```

#### 🟡 2FA (Two-Factor Authentication)
**Necessidade**: Camada extra de segurança para contas sensíveis.

**Implementação** (TOTP com Google Authenticator):
```typescript
// npm install otplib qrcode

export const usersTable = pgTable('users', {
  // ... campos existentes
  twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
});

// Service
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

async enable2FA(userId: string) {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, 'Healz', secret);
  const qrCode = await QRCode.toDataURL(otpauth);

  // Salvar secret temporariamente (confirmar após validação)
  return { qrCode, secret };
}

async verify2FA(userId: string, token: string, secret: string) {
  const isValid = authenticator.verify({ token, secret });
  if (isValid) {
    await db.update(usersTable).set({
      twoFactorSecret: secret,
      twoFactorEnabled: true
    });
  }
  return isValid;
}
```

### 3. **Monitoramento e Observabilidade**

#### 🟡 Métricas de Autenticação
**Necessidade**: Monitorar saúde do sistema de auth.

**Implementação**:
```typescript
// Usar Prometheus + Grafana
import { Counter, Histogram } from 'prom-client';

export const loginAttempts = new Counter({
  name: 'auth_login_attempts_total',
  help: 'Total de tentativas de login',
  labelNames: ['status'], // 'success', 'failed'
});

export const tokenRefreshDuration = new Histogram({
  name: 'auth_token_refresh_duration_seconds',
  help: 'Tempo de refresh de tokens',
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Usar em AuthService
async login(email: string, password: string) {
  try {
    const result = await this.validateCredentials(email, password);
    loginAttempts.inc({ status: 'success' });
    return result;
  } catch (error) {
    loginAttempts.inc({ status: 'failed' });
    throw error;
  }
}
```

#### 🟡 Logging Estruturado
**Necessidade**: Logs consistentes para debugging e análise.

**Implementação**:
```typescript
// Usar winston ou pino
import { Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async login(email: string, password: string) {
    this.logger.log({
      action: 'login_attempt',
      email,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.authenticate(email, password);
      this.logger.log({
        action: 'login_success',
        userId: result.userId,
        organizationId: result.organizationId,
      });
      return result;
    } catch (error) {
      this.logger.error({
        action: 'login_failed',
        email,
        error: error.message,
      });
      throw error;
    }
  }
}
```

### 4. **Testes**

#### 🔴 Cobertura de Testes
**Problema**: Não há testes E2E ou unitários visíveis para auth.

**Solução**:
```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  describe('login', () => {
    it('deve retornar tokens válidos com credenciais corretas', async () => {
      const result = await authService.login('user@example.com', 'password123');
      expect(result.accessToken).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('deve lançar UnauthorizedException com senha incorreta', async () => {
      await expect(
        authService.login('user@example.com', 'wrongpassword')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve incluir apenas clínicas com acesso do usuário', async () => {
      const result = await authService.login('user@example.com', 'password123');
      expect(result.user.clinicAccess).toHaveLength(2);
    });
  });

  describe('refresh', () => {
    it('deve gerar novo access token com refresh token válido', async () => {
      const refreshToken = 'valid-refresh-token';
      const result = await authService.refresh(refreshToken);
      expect(result.accessToken).toBeDefined();
    });

    it('deve rejeitar refresh token expirado', async () => {
      await expect(
        authService.refresh('expired-token')
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

// auth.e2e.spec.ts
describe('Auth E2E', () => {
  it('POST /auth/login deve retornar 200 e tokens', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'Test123!@#' })
      .expect(200)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.headers['set-cookie']).toBeDefined(); // refresh token
      });
  });

  it('POST /auth/login deve retornar 401 com credenciais inválidas', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' })
      .expect(401);
  });
});
```

---

## 🚀 Próximos Passos Recomendados

### Prioridade ALTA (Implementar primeiro)

1. **Rate Limiting** (1-2 horas)
   - Instalar `@nestjs/throttler`
   - Configurar limites para login/refresh
   - Previne brute force attacks

2. **Refresh Token Rotation** (2-3 horas)
   - Implementar rotação automática
   - Adicionar detecção de reuso
   - Melhorar segurança significativamente

3. **Testes Automatizados** (1-2 dias)
   - Cobertura mínima de 80% em auth.service
   - Testes E2E para fluxos críticos
   - CI/CD com testes obrigatórios

4. **Secret Management** (3-4 horas)
   - Mover JWT_SECRET para secret manager ou arquivo protegido
   - Implementar rotação de secrets
   - Documentar processo de deploy

### Prioridade MÉDIA (Próximas sprints)

5. **Password Reset** (1 dia)
   - Endpoint de forgot-password
   - Email com token de reset
   - Expiração de 1 hora

6. **Email Verification** (1 dia)
   - Verificação obrigatória de email
   - Reenvio de email de verificação
   - Bloqueio de acesso até verificar

7. **Auditoria de Acessos** (2-3 dias)
   - Tabela de audit logs
   - Interceptor automático
   - Dashboard de visualização

8. **Monitoramento** (2 dias)
   - Métricas Prometheus
   - Dashboards Grafana
   - Alertas para anomalias

### Prioridade BAIXA (Futuro)

9. **2FA (Two-Factor Auth)** (3-4 dias)
   - TOTP com Google Authenticator
   - Opcional por usuário
   - Backup codes

10. **Session Management** (2 dias)
    - Listagem de sessões ativas
    - Revogação de sessões específicas
    - Logout em todos os dispositivos

11. **OAuth2 / Social Login** (1 semana)
    - Google, Microsoft
    - Link de contas existentes
    - Better Auth integration

---

## 📊 Checklist de Segurança

Use este checklist para validar a segurança da implementação:

### Autenticação
- [x] Passwords hasheados com bcrypt
- [x] JWT com expiração curta (15min)
- [x] Refresh tokens persistidos
- [x] httpOnly cookies para refresh tokens
- [ ] Rate limiting em endpoints de auth
- [ ] Refresh token rotation
- [ ] Password strength validation
- [ ] Account lockout após tentativas falhadas
- [ ] Email verification
- [ ] Password reset seguro

### Autorização
- [x] Role-based access control
- [x] Guards para proteger endpoints
- [x] Validação de acesso à clínica
- [ ] Auditoria de acessos
- [ ] Permission-based access (granular)

### Multi-Tenancy
- [x] RLS (Row-Level Security) implementado
- [x] Cleanup de contexto após request
- [x] Isolamento por organization
- [ ] Testes de isolamento entre tenants
- [ ] Validação de cross-tenant access

### Infraestrutura
- [x] CORS configurado
- [x] HTTPS em produção
- [x] Environment-based configuration
- [ ] Secret management adequado
- [ ] Monitoramento de métricas
- [ ] Logging estruturado
- [ ] Backup de refresh tokens

### Testes
- [ ] Testes unitários (auth.service)
- [ ] Testes E2E (fluxos completos)
- [ ] Testes de segurança (penetration testing)
- [ ] Testes de carga (rate limiting)

---

## 💡 Considerações Arquiteturais

### Quando Escalar

A arquitetura atual é sólida para escalar até:
- **~100 organizações** com modelo atual
- **~10.000 usuários** com índices adequados
- **~1M requests/dia** com caching

### Melhorias Futuras (quando necessário)

1. **Redis para Refresh Tokens**
   - Melhor performance em leitura
   - Expiração automática (TTL)
   - Clusters Redis para HA

2. **API Gateway**
   - Kong, AWS API Gateway
   - Rate limiting centralizado
   - Autenticação em edge

3. **Separação de Auth Service**
   - Microserviço dedicado
   - Escala independente
   - SSO (Single Sign-On)

4. **Database Sharding**
   - Por organization_id
   - Quando passar de 1TB

---

## 🎯 Conclusão

### Resumo Executivo

**Implementação Atual: 8.5/10**

A arquitetura de autenticação e multi-tenancy está **muito bem implementada** considerando os objetivos de simplicidade e robustez. Os principais pilares estão sólidos:

✅ **Segurança de base forte** - JWT, bcrypt, RLS
✅ **Arquitetura limpa** - Fácil manter e evoluir
✅ **Multi-tenancy robusto** - Isolamento adequado
✅ **Escalabilidade** - Suporta crescimento inicial

### Gaps Principais

🔴 **Críticos** (implementar em 1-2 semanas):
- Rate limiting
- Refresh token rotation
- Testes automatizados
- Secret management

🟡 **Importantes** (próximo mês):
- Password reset
- Email verification
- Auditoria
- Monitoramento

### Recomendação Final

**Não over-engenheirar agora.** A base está sólida. Foco:

1. Completar gaps críticos de segurança (rate limiting, token rotation)
2. Adicionar testes para garantir qualidade contínua
3. Implementar funcionalidades essenciais (password reset, email verification)
4. Monitorar e iterar com base em uso real

A arquitetura atual vai suportar bem o crescimento inicial. Escalar prematuramente (microserviços, Redis, etc.) seria over-engineering. Implemente melhorias incrementalmente conforme necessidade real.

---

**Documento criado em**: 2026-02-07
**Versão da implementação analisada**: apps/api (commit 198e15b)
**Próxima revisão sugerida**: Após implementação dos gaps críticos

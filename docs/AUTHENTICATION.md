# Autenticação e Multi-tenancy - Healz

## Visão Geral

Este documento especifica a arquitetura de autenticação e multi-tenancy do Healz, incluindo integração com Auth0/Clerk, JWT tokens, context switching e Row-Level Security.

**Princípios:**

- JWT com contexto organizacional
- Context switching para médicos multi-clínica
- Row-Level Security (RLS) automática
- Defesa em profundidade (RLS + application-level)

---

## Estrutura JWT Token

### Payload do Token

```typescript
// src/auth/types/jwt-payload.interface.ts
export interface JwtPayload {
  // === User Info ===
  userId: string;
  email: string;
  authProviderId: string; // Auth0/Clerk ID

  // === Context ===
  organizationId: string;
  clinicId?: string; // Opcional - pode não estar em contexto de clínica

  // === Permissions ===
  role: string;
  permissions: string[];

  // === Standard JWT Claims ===
  iat: number; // Issued at
  exp: number; // Expiration
}
```

### Exemplo de Token Decodificado

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "maria@example.com",
  "authProviderId": "auth0|123456789",
  "organizationId": "org-abc-123",
  "clinicId": "clinic-xyz-456",
  "role": "receptionist",
  "permissions": [
    "appointments.view",
    "appointments.create",
    "appointments.update",
    "patients.view",
    "patients.create",
    "conversations.view",
    "conversations.reply"
  ],
  "iat": 1738281600,
  "exp": 1738310400
}
```

---

## Auth Service

### Interface Principal

```typescript
// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { DrizzleService } from "../db/drizzle.service";
import { eq, and } from "drizzle-orm";
import {
  users,
  clinics,
  clinicUsers,
  organizationUsers,
  roles,
} from "../db/schema";
import { JwtPayload } from "./types/jwt-payload.interface";

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private db: DrizzleService,
  ) {}

  /**
   * Callback do Auth0/Clerk - criar ou atualizar usuário
   */
  async handleAuthCallback(authData: AuthCallbackDto): Promise<AuthResponse> {
    // 1. Buscar ou criar usuário
    let user = await this.findUserByAuthProviderId(authData.authProviderId);

    if (!user) {
      user = await this.createUser({
        authProviderId: authData.authProviderId,
        email: authData.email,
        fullName: authData.fullName,
        phone: authData.phone,
      });
    }

    // 2. Buscar primeira organização acessível
    const orgAccess = await this.getFirstOrganizationAccess(user.id);

    if (!orgAccess) {
      throw new UnauthorizedException("User has no organization access");
    }

    // 3. Gerar token
    return this.generateToken(user, orgAccess);
  }

  /**
   * Context Switching - trocar de clínica
   */
  async switchContext(
    userId: string,
    targetClinicId: string,
  ): Promise<AuthResponse> {
    // 1. Verificar se usuário tem acesso à clínica
    const clinicAccess = await this.db.db
      .select({
        clinic: clinics,
        clinicUser: clinicUsers,
        role: roles,
      })
      .from(clinicUsers)
      .innerJoin(clinics, eq(clinics.id, clinicUsers.clinicId))
      .innerJoin(roles, eq(roles.id, clinicUsers.roleId))
      .where(
        and(
          eq(clinicUsers.userId, userId),
          eq(clinicUsers.clinicId, targetClinicId),
          eq(clinicUsers.status, "active"),
        ),
      )
      .limit(1);

    if (!clinicAccess.length) {
      throw new UnauthorizedException(
        "User does not have access to this clinic",
      );
    }

    const [access] = clinicAccess;

    // 2. Buscar usuário
    const user = await this.findUserById(userId);

    // 3. Mesclar permissões customizadas
    const permissions = this.mergePermissions(
      access.role.permissions as string[],
      access.clinicUser.customPermissions as string[] | null,
    );

    // 4. Gerar novo token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      authProviderId: user.authProviderId,
      organizationId: access.clinic.organizationId,
      clinicId: targetClinicId,
      role: access.role.name,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8 horas
    };

    return {
      accessToken: this.jwtService.sign(payload),
      context: {
        organizationId: access.clinic.organizationId,
        clinicId: targetClinicId,
        role: access.role.name,
      },
    };
  }

  /**
   * Listar clínicas disponíveis para context switching
   */
  async getAvailableContexts(userId: string): Promise<AvailableContext[]> {
    const contexts = await this.db.db
      .select({
        organization: {
          id: clinics.organizationId,
          name: organizations.name,
        },
        clinic: {
          id: clinics.id,
          name: clinics.name,
        },
        role: {
          id: roles.id,
          name: roles.name,
        },
      })
      .from(clinicUsers)
      .innerJoin(clinics, eq(clinics.id, clinicUsers.clinicId))
      .innerJoin(organizations, eq(organizations.id, clinics.organizationId))
      .innerJoin(roles, eq(roles.id, clinicUsers.roleId))
      .where(
        and(eq(clinicUsers.userId, userId), eq(clinicUsers.status, "active")),
      );

    return contexts.map((ctx) => ({
      organizationId: ctx.organization.id,
      organizationName: ctx.organization.name,
      clinicId: ctx.clinic.id,
      clinicName: ctx.clinic.name,
      role: ctx.role.name,
    }));
  }

  /**
   * Mesclar permissões base + customizadas
   */
  private mergePermissions(
    rolePermissions: string[],
    customPermissions?: string[] | null,
  ): string[] {
    if (!customPermissions || customPermissions.length === 0) {
      return rolePermissions;
    }

    // Custom permissions podem adicionar ou remover
    // Formato: ["patients.view", "-appointments.delete"]
    const additions = customPermissions.filter((p) => !p.startsWith("-"));
    const removals = customPermissions
      .filter((p) => p.startsWith("-"))
      .map((p) => p.substring(1));

    return [
      ...rolePermissions.filter((p) => !removals.includes(p)),
      ...additions,
    ];
  }

  /**
   * Gerar token JWT
   */
  private async generateToken(
    user: User,
    access: OrgAccess,
  ): Promise<AuthResponse> {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      authProviderId: user.authProviderId,
      organizationId: access.organizationId,
      clinicId: access.clinicId || undefined,
      role: access.role.name,
      permissions: access.role.permissions as string[],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8 horas
    };

    return {
      accessToken: this.jwtService.sign(payload),
      context: {
        organizationId: access.organizationId,
        clinicId: access.clinicId,
        role: access.role.name,
      },
    };
  }

  // ... métodos auxiliares (findUserById, createUser, etc)
}
```

---

## JWT Strategy

```typescript
// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { JwtPayload } from "../types/jwt-payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Payload já foi validado pelo passport-jwt
    // Aqui podemos adicionar validações extras se necessário

    if (!payload.userId || !payload.organizationId) {
      throw new UnauthorizedException("Invalid token payload");
    }

    return payload;
  }
}
```

---

## Guards e Decorators

### JWT Auth Guard

```typescript
// src/auth/guards/jwt-auth.guard.ts
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
```

### Tenant Isolation Guard

```typescript
// src/auth/guards/tenant-isolation.guard.ts
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TENANT_ISOLATED } from "../decorators/tenant-isolated.decorator";

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isTenantIsolated = this.reflector.get<boolean>(
      TENANT_ISOLATED,
      context.getHandler(),
    );

    if (!isTenantIsolated) {
      return true; // Endpoint não requer isolamento
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Garantir que organizationId está presente
    if (!user || !user.organizationId) {
      return false;
    }

    // Adicionar contexto para uso posterior
    request.tenantId = user.organizationId;
    request.clinicId = user.clinicId;

    return true;
  }
}
```

### Permissions Guard

```typescript
// src/auth/guards/permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRED_PERMISSIONS } from "../decorators/permissions.decorator";
import { JwtPayload } from "../types/jwt-payload.interface";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      REQUIRED_PERMISSIONS,
      context.getHandler(),
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user || !user.permissions) {
      return false;
    }

    // Verificar se user tem todas as permissões requeridas
    return requiredPermissions.every((permission) =>
      this.hasPermission(user.permissions, permission),
    );
  }

  private hasPermission(userPermissions: string[], required: string): boolean {
    // Suporta wildcard: ["appointments.*"] permite "appointments.view", "appointments.create", etc
    return userPermissions.some((permission) => {
      if (permission === "*") return true; // Admin
      if (permission === required) return true;

      // Wildcard check
      if (permission.endsWith(".*")) {
        const prefix = permission.slice(0, -2);
        return required.startsWith(prefix);
      }

      return false;
    });
  }
}
```

### Decorators

```typescript
// src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtPayload } from "../types/jwt-payload.interface";

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// src/auth/decorators/tenant-isolated.decorator.ts
import { SetMetadata } from "@nestjs/common";

export const TENANT_ISOLATED = "tenant_isolated";
export const TenantIsolated = () => SetMetadata(TENANT_ISOLATED, true);

// src/auth/decorators/permissions.decorator.ts
import { SetMetadata } from "@nestjs/common";

export const REQUIRED_PERMISSIONS = "required_permissions";
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);
```

---

## Row-Level Security (RLS)

### RLS Interceptor

```typescript
// src/db/interceptors/rls.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { DrizzleService } from "../drizzle.service";
import { sql } from "drizzle-orm";

@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(private db: DrizzleService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Do JWT

    if (user) {
      // Setar contexto PostgreSQL para RLS policies
      await this.db.db.execute(sql`
        SELECT set_config('app.current_user_id', ${user.userId}, true);
        SELECT set_config('app.current_tenant_id', ${user.organizationId}, true);
        SELECT set_config('app.current_clinic_id', ${user.clinicId || ""}, true);
      `);
    }

    return next.handle();
  }
}
```

### SQL Policies (aplicadas via migration)

```sql
-- Migration: Enable RLS
ALTER TABLE patients_view ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations_view ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments_view ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_view ENABLE ROW LEVEL SECURITY;

-- Policy: Isolamento por organização
CREATE POLICY tenant_isolation ON patients_view
  USING (organization_id = current_setting('app.current_tenant_id')::uuid);

-- Policy: Isolamento por clínica (quando aplicável)
CREATE POLICY clinic_isolation ON conversations_view
  USING (
    clinic_id = current_setting('app.current_clinic_id')::uuid
    OR current_setting('app.current_clinic_id') = ''
  );

CREATE POLICY clinic_isolation ON appointments_view
  USING (
    clinic_id = current_setting('app.current_clinic_id')::uuid
    OR current_setting('app.current_clinic_id') = ''
  );

CREATE POLICY clinic_isolation ON journey_view
  USING (
    clinic_id = current_setting('app.current_clinic_id')::uuid
    OR current_setting('app.current_clinic_id') = ''
  );
```

---

## DTOs

```typescript
// src/auth/dto/auth-callback.dto.ts
import { IsString, IsEmail, IsOptional } from "class-validator";

export class AuthCallbackDto {
  @IsString()
  authProviderId: string;

  @IsEmail()
  email: string;

  @IsString()
  fullName: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

// src/auth/dto/switch-context.dto.ts
import { IsUUID } from "class-validator";

export class SwitchContextDto {
  @IsUUID()
  clinicId: string;
}

// src/auth/dto/auth-response.dto.ts
export interface AuthResponse {
  accessToken: string;
  context: {
    organizationId: string;
    clinicId?: string;
    role: string;
  };
}

export interface AvailableContext {
  organizationId: string;
  organizationName: string;
  clinicId: string;
  clinicName: string;
  role: string;
}
```

---

## Auth Controller

```typescript
// src/auth/auth.controller.ts
import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { JwtPayload } from "./types/jwt-payload.interface";
import {
  AuthCallbackDto,
  SwitchContextDto,
  AuthResponse,
  AvailableContext,
} from "./dto";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /auth/callback
   * Callback do Auth0/Clerk após login
   */
  @Post("callback")
  async handleAuthCallback(
    @Body() dto: AuthCallbackDto,
  ): Promise<AuthResponse> {
    return this.authService.handleAuthCallback(dto);
  }

  /**
   * POST /auth/switch-context
   * Trocar contexto de clínica
   */
  @Post("switch-context")
  @UseGuards(JwtAuthGuard)
  async switchContext(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SwitchContextDto,
  ): Promise<AuthResponse> {
    return this.authService.switchContext(user.userId, dto.clinicId);
  }

  /**
   * GET /auth/me
   * Retornar informações do usuário atual
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: JwtPayload) {
    return {
      userId: user.userId,
      email: user.email,
      organizationId: user.organizationId,
      clinicId: user.clinicId,
      role: user.role,
      permissions: user.permissions,
    };
  }

  /**
   * GET /auth/available-contexts
   * Listar clínicas disponíveis para context switching
   */
  @Get("available-contexts")
  @UseGuards(JwtAuthGuard)
  async getAvailableContexts(
    @CurrentUser() user: JwtPayload,
  ): Promise<AvailableContext[]> {
    return this.authService.getAvailableContexts(user.userId);
  }

  /**
   * POST /auth/refresh
   * Renovar token (mantendo mesmo contexto)
   */
  @Post("refresh")
  @UseGuards(JwtAuthGuard)
  async refreshToken(@CurrentUser() user: JwtPayload): Promise<AuthResponse> {
    // Re-gerar token com mesmo contexto
    if (user.clinicId) {
      return this.authService.switchContext(user.userId, user.clinicId);
    }

    // Se não tem clinicId, gerar com primeiro acesso disponível
    const contexts = await this.authService.getAvailableContexts(user.userId);
    if (contexts.length === 0) {
      throw new UnauthorizedException("No available contexts");
    }

    return this.authService.switchContext(user.userId, contexts[0].clinicId);
  }
}
```

---

## Auth Module

```typescript
// src/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { DrizzleModule } from "../db/drizzle.module";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "8h",
        },
      }),
    }),
    DrizzleModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

---

## Environment Variables

```bash
# .env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=8h

# Auth0/Clerk
AUTH_PROVIDER=auth0  # ou 'clerk'
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# ou para Clerk
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## Uso nos Controllers

### Exemplo Completo

```typescript
// src/patients/patients.controller.ts
import { Controller, Get, UseGuards, Query, Param } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantIsolationGuard } from "../auth/guards/tenant-isolation.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { TenantIsolated } from "../auth/decorators/tenant-isolated.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/types/jwt-payload.interface";

@Controller("patients")
@UseGuards(JwtAuthGuard, TenantIsolationGuard, PermissionsGuard)
@TenantIsolated()
export class PatientsController {
  /**
   * GET /patients
   * Listar pacientes da organização
   */
  @Get()
  @RequirePermissions("patients.view")
  async listPatients(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListPatientsDto,
  ) {
    // Query automática filtra por organizationId via RLS
    // E via application-level usando user.organizationId
  }

  /**
   * GET /patients/:id
   * Detalhes de um paciente
   */
  @Get(":id")
  @RequirePermissions("patients.view")
  async getPatient(
    @CurrentUser() user: JwtPayload,
    @Param("id") patientId: string,
  ) {
    // Buscar patient + validar se pertence à org do user
  }
}
```

---

## Fluxos Completos

### Fluxo 1: Login Inicial

```
1. Usuário faz login no Auth0/Clerk
2. Frontend recebe callback com authProviderId
3. Frontend chama POST /auth/callback com authProviderId
4. Backend:
   - Busca/cria usuário
   - Busca primeira organização acessível
   - Gera JWT com contexto inicial
5. Frontend armazena token
6. Frontend redireciona para dashboard
```

### Fluxo 2: Context Switching

```
1. Usuário clica em "Trocar Clínica" no dashboard
2. Frontend chama GET /auth/available-contexts
3. Frontend exibe lista de clínicas disponíveis
4. Usuário seleciona clínica
5. Frontend chama POST /auth/switch-context { clinicId }
6. Backend:
   - Valida acesso
   - Gera novo JWT com novo contexto
7. Frontend substitui token antigo
8. Dashboard recarrega com nova clínica
```

### Fluxo 3: Request Autenticado

```
1. Frontend envia request com header:
   Authorization: Bearer eyJhbGc...

2. JwtAuthGuard valida token
3. JWT Strategy extrai payload
4. TenantIsolationGuard valida organizationId
5. PermissionsGuard valida permissões
6. RlsInterceptor seta contexto PostgreSQL
7. Controller executa com user context
8. Queries automáticas filtram por tenant
```

---

## Segurança

### Checklist de Segurança

- ✅ Tokens expiram em 8h
- ✅ RLS aplicado em todas as views
- ✅ Application-level filtering como camada extra
- ✅ Validação de permissões granulares
- ✅ Context switching validado
- ✅ Secrets em variáveis de ambiente
- ✅ HTTPS obrigatório em produção

### Próximas Melhorias

- ⏳ Refresh tokens
- ⏳ Token revocation
- ⏳ Rate limiting por usuário
- ⏳ Audit log de trocas de contexto
- ⏳ 2FA (Two-Factor Authentication)

---

## Documentação Relacionada

- [DRIZZLE_SCHEMA.md](./DRIZZLE_SCHEMA.md) - Schema do banco de dados
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Endpoints da API
- [MULTI_TENANT.md](../MULTI_TENANT.md) - Arquitetura multi-tenant

# Plano de Implementação: Autenticação e Multi-Tenant

## Objetivo

Implementar o core de cadastro, autenticação e multi-tenant usando **Better Auth** integrado ao **NestJS** com **Drizzle ORM**.

## Decisões Arquiteturais

| Aspecto | Decisão |
|---------|---------|
| Framework | NestJS (mantido) |
| Auth Library | Better Auth |
| ORM | Drizzle |
| Hierarquia | Organization → Clinic → User |
| Roles | admin, manager, doctor, receptionist |
| Estratégia Multi-tenant | Shared DB + Row-Level Security |

---

## Fase 1: Setup Better Auth + Schema

### 1.1 Instalar Dependências

```bash
pnpm add better-auth @better-auth/cli -F @healz/api
```

### 1.2 Criar Auth Config

**Arquivo**: `apps/api/src/auth/auth.ts`

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "../db/connection";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false, // Simplificar MVP
  },
  session: {
    expiresIn: 60 * 60 * 8, // 8 horas
    updateAge: 60 * 60, // Refresh a cada 1 hora
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutos
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
  ],
});

export type Auth = typeof auth;
```

### 1.3 Gerar Schema Better Auth

```bash
pnpm dlx @better-auth/cli generate --output ./apps/api/src/db/auth-schema.ts
```

### 1.4 Criar Schema Completo Drizzle

**Arquivo**: `apps/api/src/db/schema.ts`

```typescript
import { pgTable, uuid, varchar, timestamp, text, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============ ENUMS ============
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);
export const orgStatusEnum = pgEnum('org_status', ['active', 'suspended', 'cancelled']);
export const clinicStatusEnum = pgEnum('clinic_status', ['active', 'inactive']);
export const roleNameEnum = pgEnum('role_name', ['admin', 'manager', 'doctor', 'receptionist']);

// ============ BETTER AUTH TABLES ============
// (Geradas pelo CLI - user, session, account, verification)

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // Campos customizados
  phone: varchar('phone', { length: 20 }),
  status: userStatusEnum('status').notNull().default('active'),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  // Contexto multi-tenant na sessão
  activeOrganizationId: text('active_organization_id'),
  activeClinicId: text('active_clinic_id'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============ MULTI-TENANT TABLES ============

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  logo: text('logo'),
  metadata: jsonb('metadata'),
  status: orgStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const member = pgTable('member', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: roleNameEnum('role').notNull().default('receptionist'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const invitation = pgTable('invitation', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: roleNameEnum('role').notNull().default('receptionist'),
  status: text('status').notNull().default('pending'), // pending, accepted, cancelled
  expiresAt: timestamp('expires_at').notNull(),
  inviterId: text('inviter_id').notNull().references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const clinic = pgTable('clinic', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: jsonb('address'), // { street, city, state, zip, country }
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Sao_Paulo'),
  settings: jsonb('settings'),
  status: clinicStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const clinicUser = pgTable('clinic_user', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinic.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: roleNameEnum('role').notNull().default('receptionist'),
  customPermissions: jsonb('custom_permissions'), // Override de permissões
  status: userStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============ RELATIONS ============

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  clinicUsers: many(clinicUser),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  clinics: many(clinic),
  invitations: many(invitation),
}));

export const clinicRelations = relations(clinic, ({ one, many }) => ({
  organization: one(organization, {
    fields: [clinic.organizationId],
    references: [organization.id],
  }),
  clinicUsers: many(clinicUser),
}));
```

### 1.5 Migration

```bash
pnpm db:generate
pnpm db:migrate
```

---

## Fase 2: Integração NestJS + Better Auth

### 2.1 Criar Auth Module

**Arquivo**: `apps/api/src/auth/auth.module.ts`

```typescript
import { Module, Global } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard],
  exports: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
```

### 2.2 Auth Controller (Handler Better Auth)

**Arquivo**: `apps/api/src/auth/auth.controller.ts`

```typescript
import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { auth } from './auth';

@Controller('api/auth')
export class AuthController {
  @All('*')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    // Converte Express req para Web Request
    const url = new URL(req.url, `http://${req.headers.host}`);
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
    });

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : undefined,
    });

    const response = await auth.handler(webRequest);

    // Converte Web Response para Express res
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.status(response.status).send(await response.text());
  }
}
```

### 2.3 Auth Service

**Arquivo**: `apps/api/src/auth/auth.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { auth } from './auth';
import { db } from '../db/connection';
import { eq, and } from 'drizzle-orm';
import { session, member, clinicUser, clinic } from '../db/schema';

@Injectable()
export class AuthService {
  async getSession(headers: Headers) {
    return auth.api.getSession({ headers });
  }

  async getUserOrganizations(userId: string) {
    return db.query.member.findMany({
      where: eq(member.userId, userId),
      with: { organization: true },
    });
  }

  async getUserClinics(userId: string, organizationId: string) {
    return db.query.clinicUser.findMany({
      where: and(
        eq(clinicUser.userId, userId),
      ),
      with: {
        clinic: {
          where: eq(clinic.organizationId, organizationId),
        },
      },
    });
  }

  async setActiveContext(sessionId: string, organizationId: string, clinicId?: string) {
    await db.update(session)
      .set({
        activeOrganizationId: organizationId,
        activeClinicId: clinicId,
      })
      .where(eq(session.id, sessionId));
  }
}
```

### 2.4 Auth Guard

**Arquivo**: `apps/api/src/auth/guards/auth.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { auth } from '../auth';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extrair headers
    const headers = new Headers();
    Object.entries(request.headers).forEach(([key, value]) => {
      if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
    });

    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Anexar user e session ao request
    request.user = session.user;
    request.session = session.session;

    return true;
  }
}
```

### 2.5 Roles Guard

**Arquivo**: `apps/api/src/auth/guards/roles.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { db } from '../../db/connection';
import { eq, and } from 'drizzle-orm';
import { member, clinicUser } from '../../db/schema';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const { user, session } = request;

    if (!user || !session.activeOrganizationId) {
      throw new ForbiddenException('No active organization context');
    }

    // Buscar role do usuário na org atual
    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.userId, user.id),
        eq(member.organizationId, session.activeOrganizationId),
      ),
    });

    if (!membership || !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    request.membership = membership;
    return true;
  }
}
```

### 2.6 Decorators

**Arquivo**: `apps/api/src/auth/decorators/index.ts`

```typescript
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const CurrentSession = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.session;
  },
);

export const CurrentOrg = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.session?.activeOrganizationId;
  },
);

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

---

## Fase 3: Endpoints Multi-Tenant

### 3.1 Organizations Controller

**Arquivo**: `apps/api/src/organizations/organizations.controller.ts`

```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, CurrentOrg } from '../auth/decorators';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';

@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Post()
  async create(@CurrentUser() user, @Body() dto: CreateOrganizationDto) {
    return this.orgsService.create(user.id, dto);
  }

  @Get()
  async listUserOrgs(@CurrentUser() user) {
    return this.orgsService.findByUser(user.id);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentUser() user) {
    return this.orgsService.findOne(id, user.id);
  }

  @Post(':id/set-active')
  async setActive(@Param('id') id: string, @CurrentUser() user, @CurrentSession() session) {
    return this.orgsService.setActive(session.id, id, user.id);
  }
}
```

### 3.2 Clinics Controller

**Arquivo**: `apps/api/src/clinics/clinics.controller.ts`

```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser, CurrentOrg } from '../auth/decorators';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto } from './dto';

@Controller('clinics')
@UseGuards(AuthGuard, RolesGuard)
export class ClinicsController {
  constructor(private clinicsService: ClinicsService) {}

  @Post()
  @Roles('admin', 'manager')
  async create(@CurrentOrg() orgId: string, @Body() dto: CreateClinicDto) {
    return this.clinicsService.create(orgId, dto);
  }

  @Get()
  async list(@CurrentOrg() orgId: string) {
    return this.clinicsService.findByOrg(orgId);
  }

  @Post(':id/set-active')
  async setActive(@Param('id') id: string, @CurrentSession() session) {
    return this.clinicsService.setActive(session.id, id);
  }
}
```

### 3.3 Members Controller (Gestão de usuários na org)

**Arquivo**: `apps/api/src/members/members.controller.ts`

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentOrg } from '../auth/decorators';
import { MembersService } from './members.service';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto';

@Controller('members')
@UseGuards(AuthGuard, RolesGuard)
export class MembersController {
  constructor(private membersService: MembersService) {}

  @Get()
  @Roles('admin', 'manager')
  async list(@CurrentOrg() orgId: string) {
    return this.membersService.findByOrg(orgId);
  }

  @Post('invite')
  @Roles('admin', 'manager')
  async invite(@CurrentOrg() orgId: string, @Body() dto: InviteMemberDto, @CurrentUser() user) {
    return this.membersService.invite(orgId, dto, user.id);
  }

  @Put(':id/role')
  @Roles('admin')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateMemberRoleDto) {
    return this.membersService.updateRole(id, dto.role);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }
}
```

---

## Fase 4: Context Switching

### 4.1 Context Controller

**Arquivo**: `apps/api/src/context/context.controller.ts`

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser, CurrentSession } from '../auth/decorators';
import { ContextService } from './context.service';
import { SwitchContextDto } from './dto';

@Controller('context')
@UseGuards(AuthGuard)
export class ContextController {
  constructor(private contextService: ContextService) {}

  @Get()
  async getCurrent(@CurrentSession() session, @CurrentUser() user) {
    return this.contextService.getCurrentContext(user.id, session);
  }

  @Get('available')
  async getAvailable(@CurrentUser() user) {
    return this.contextService.getAvailableContexts(user.id);
  }

  @Post('switch')
  async switch(@CurrentSession() session, @CurrentUser() user, @Body() dto: SwitchContextDto) {
    return this.contextService.switchContext(session.id, user.id, dto);
  }
}
```

---

## Fase 5: Row-Level Security (RLS)

### 5.1 Migration para RLS

**Arquivo**: `apps/api/src/db/migrations/add-rls.sql`

```sql
-- Habilitar RLS
ALTER TABLE clinic ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_user ENABLE ROW LEVEL SECURITY;

-- Função para pegar org do contexto
CREATE OR REPLACE FUNCTION current_org_id() RETURNS TEXT AS $$
  SELECT current_setting('app.current_org_id', true);
$$ LANGUAGE SQL STABLE;

-- Policy: Clinics isoladas por org
CREATE POLICY clinic_org_isolation ON clinic
  USING (organization_id = current_org_id());

-- Policy: ClinicUsers isolados por org (via clinic)
CREATE POLICY clinic_user_org_isolation ON clinic_user
  USING (
    clinic_id IN (
      SELECT id FROM clinic WHERE organization_id = current_org_id()
    )
  );
```

### 5.2 RLS Middleware

**Arquivo**: `apps/api/src/db/middleware/rls.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { db } from '../connection';
import { sql } from 'drizzle-orm';

@Injectable()
export class RlsMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const session = (req as any).session;

    if (session?.activeOrganizationId) {
      await db.execute(
        sql`SELECT set_config('app.current_org_id', ${session.activeOrganizationId}, true)`
      );
    }

    next();
  }
}
```

---

## Resumo de Endpoints

### Auth (Better Auth)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/sign-up/email` | Cadastro com email/senha |
| POST | `/api/auth/sign-in/email` | Login |
| POST | `/api/auth/sign-out` | Logout |
| GET | `/api/auth/session` | Sessão atual |

### Organizations
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/organizations` | Criar organização |
| GET | `/organizations` | Listar orgs do usuário |
| POST | `/organizations/:id/set-active` | Definir org ativa |

### Clinics
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/clinics` | Criar clínica (admin/manager) |
| GET | `/clinics` | Listar clínicas da org ativa |
| POST | `/clinics/:id/set-active` | Definir clínica ativa |

### Members
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/members` | Listar membros da org |
| POST | `/members/invite` | Convidar membro |
| PUT | `/members/:id/role` | Alterar role |
| DELETE | `/members/:id` | Remover membro |

### Context
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/context` | Contexto atual |
| GET | `/context/available` | Contextos disponíveis |
| POST | `/context/switch` | Trocar contexto |

---

## Estrutura Final de Arquivos

```
apps/api/src/
├── auth/
│   ├── auth.ts                 # Config Better Auth
│   ├── auth.module.ts
│   ├── auth.controller.ts      # Handler Better Auth
│   ├── auth.service.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── roles.guard.ts
│   └── decorators/
│       └── index.ts
├── organizations/
│   ├── organizations.module.ts
│   ├── organizations.controller.ts
│   ├── organizations.service.ts
│   └── dto/
├── clinics/
│   ├── clinics.module.ts
│   ├── clinics.controller.ts
│   ├── clinics.service.ts
│   └── dto/
├── members/
│   ├── members.module.ts
│   ├── members.controller.ts
│   ├── members.service.ts
│   └── dto/
├── context/
│   ├── context.module.ts
│   ├── context.controller.ts
│   └── context.service.ts
├── db/
│   ├── schema.ts               # Schema Drizzle completo
│   ├── connection.ts
│   └── middleware/
│       └── rls.middleware.ts
└── app.module.ts
```

---

## Ordem de Execução

1. **Fase 1**: Setup Better Auth + Schema (1-2h)
2. **Fase 2**: Integração NestJS (2-3h)
3. **Fase 3**: Endpoints Multi-Tenant (2-3h)
4. **Fase 4**: Context Switching (1h)
5. **Fase 5**: RLS (1h)

**Total estimado**: 7-10h de implementação

---

## Validações de Segurança

- [x] Senhas hashadas pelo Better Auth (bcrypt)
- [x] Sessions com expiração de 8h
- [x] RLS no banco de dados
- [x] Guards de autenticação em todos endpoints protegidos
- [x] Validação de role para operações sensíveis
- [x] Isolamento de dados por organization

---

## Próximos Passos (Pós-MVP)

- [ ] Email verification
- [ ] Password reset flow
- [ ] Refresh tokens
- [ ] Audit log de ações
- [ ] 2FA
- [ ] Rate limiting

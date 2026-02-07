# Plano: Auditoria de Acessos

## Contexto

Não existe registro de quem acessou o quê e quando. Para uma plataforma de saúde, auditoria é essencial para compliance (LGPD, HIPAA) e investigação de incidentes. A implementação usa um interceptor NestJS que loga automaticamente todas as ações autenticadas, sem poluir a lógica de negócio.

## Arquivos a Criar/Alterar

- `apps/api/src/db/schema/audit.schema.ts` — nova tabela
- `apps/api/src/db/schema/index.ts` — exportar nova tabela
- `apps/api/src/audit/audit.module.ts` — novo módulo
- `apps/api/src/audit/audit.service.ts` — serviço de log
- `apps/api/src/audit/audit.interceptor.ts` — interceptor automático
- `apps/api/src/app.module.ts` — registrar módulo e interceptor
- `apps/api/src/auth/auth.service.ts` — logs explícitos para login/logout

## Passos

### 1. Criar tabela `audit_logs` no schema

**Criar `apps/api/src/db/schema/audit.schema.ts`:**

```typescript
import { integer, pgTable, timestamp, uuid, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { users } from "./auth.schema";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(),  // LOGIN, LOGOUT, READ, CREATE, UPDATE, DELETE
  resource: varchar("resource", { length: 255 }).notNull(), // ex: /api/patients/123
  method: varchar("method", { length: 10 }).notNull(),      // GET, POST, PUT, DELETE
  statusCode: integer("status_code"),
  ip: varchar("ip", { length: 45 }),
  userAgent: text("user_agent"),
  organizationId: uuid("organization_id"),
  clinicId: uuid("clinic_id"),
  metadata: jsonb("metadata"), // dados extras (ex: body resumido, query params)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Atualizar `apps/api/src/db/schema/index.ts`** para exportar:

```typescript
export * from "./audit.schema";
```

Gerar migration: `pnpm drizzle-kit generate`

### 2. Criar `AuditService`

**Criar `apps/api/src/audit/audit.service.ts`:**

```typescript
import { Injectable } from "@nestjs/common";
import { db } from "../db";
import { auditLogs } from "../db/schema";

interface AuditEntry {
  userId?: string;
  action: string;
  resource: string;
  method: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  organizationId?: string;
  clinicId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  async log(entry: AuditEntry): Promise<void> {
    // Fire-and-forget: não bloqueia o request
    db.insert(auditLogs)
      .values(entry)
      .catch((err) => console.error("Audit log failed:", err));
  }
}
```

**Nota**: o `log()` é fire-and-forget. Não queremos que uma falha no audit bloqueie ou falhe o request do usuário.

### 3. Criar `AuditInterceptor`

O interceptor captura automaticamente requests autenticados e loga após a resposta.

**Criar `apps/api/src/audit/audit.interceptor.ts`:**

```typescript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { AuditService } from "./audit.service";

// Mapeia HTTP method para action legível
const METHOD_ACTION_MAP: Record<string, string> = {
  GET: "READ",
  POST: "CREATE",
  PUT: "UPDATE",
  PATCH: "UPDATE",
  DELETE: "DELETE",
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user = request.user; // Populado pelo JwtAuthGuard

    // Só logar requests autenticados
    if (!user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.auditService.log({
          userId: user.userId,
          action: METHOD_ACTION_MAP[request.method] || request.method,
          resource: request.originalUrl,
          method: request.method,
          statusCode: response.statusCode,
          ip: request.ip,
          userAgent: request.headers["user-agent"],
          organizationId: user.organizationId,
          clinicId: user.activeClinicId,
        });
      }),
    );
  }
}
```

### 4. Criar `AuditModule`

**Criar `apps/api/src/audit/audit.module.ts`:**

```typescript
import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { AuditInterceptor } from "./audit.interceptor";

@Global()
@Module({
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
```

### 5. Registrar no `app.module.ts`

Importar o módulo e registrar o interceptor globalmente:

```typescript
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditModule } from "./audit/audit.module";
import { AuditInterceptor } from "./audit/audit.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "apps/api/.env" }),
    AuthModule,
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
```

### 6. Adicionar logs explícitos de auth no `auth.service.ts`

Eventos de login e logout são especiais — devem ser logados mesmo antes do interceptor (login não tem user autenticado no request).

```typescript
// Injetar AuditService no AuthService
constructor(
  private jwtService: JwtService,
  private auditService: AuditService,
) {}

// No login, após sucesso:
this.auditService.log({
  userId: user[0].id,
  action: "LOGIN",
  resource: "/auth/login",
  method: "POST",
  ip, // extrair do request no controller e passar como parâmetro
  organizationId: activeClinic.organizationId,
  clinicId: activeClinic.clinicId,
});

// No login, após falha (email não encontrado ou senha errada):
this.auditService.log({
  action: "LOGIN_FAILED",
  resource: "/auth/login",
  method: "POST",
  ip,
  metadata: { email }, // logar email tentado, sem a senha
});

// No logout:
this.auditService.log({
  userId: tokenRecord[0]?.userId,
  action: "LOGOUT",
  resource: "/auth/logout",
  method: "POST",
});
```

Para passar o `ip` do request para o service, ajustar a assinatura do `login()`:

```typescript
// auth.service.ts
async login(email: string, password: string, preferredClinicId?: string, ip?: string)

// auth.controller.ts
const result = await this.authService.login(
  loginDto.email, loginDto.password, loginDto.clinicId, request.ip,
);
```

### 7. Gerar e aplicar migration

```bash
cd apps/api
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 8. (Opcional) Endpoint de consulta de logs

Para admins visualizarem os logs, criar um endpoint protegido:

```typescript
// audit.controller.ts
@Controller("audit")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get("logs")
  async getLogs(@Query() query: { page?: number; limit?: number }) {
    return this.auditService.findLogs(query);
  }
}
```

Esse endpoint pode ser criado num momento posterior. O importante é que os dados já estarão sendo coletados.

## Resultado Esperado

- Toda ação autenticada é registrada automaticamente via interceptor
- Login (sucesso e falha) e logout são logados explicitamente
- Logs incluem: quem, o quê, quando, de onde (IP), em qual organização/clínica
- Fire-and-forget: audit nunca bloqueia ou falha requests
- Dados disponíveis para compliance e investigação

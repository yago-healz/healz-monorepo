# Multi-Tenancy Deep Dive - Healz

## Visão Geral

Este documento aprofunda a implementação de multi-tenancy no Healz, cobrindo estratégias de isolamento de dados, Row-Level Security (RLS), performance, custos, e casos extremos.

Para visão geral da arquitetura multi-tenant, veja [MULTI_TENANT.MD](./MULTI_TENANT.MD).

---

## Estratégias de Multi-tenancy: Comparação

### 1. Database per Tenant (❌ Não usado)

```
Organization A → database_org_a
Organization B → database_org_b
Organization C → database_org_c
```

**Vantagens:**

- ✅ Isolamento perfeito
- ✅ Fácil backup por tenant
- ✅ Performance isolada

**Desvantagens:**

- ❌ Custo alto (N databases)
- ❌ Migrações complexas
- ❌ Analytics cross-tenant impossível

### 2. Schema per Tenant (❌ Não usado)

```
Database Único
  ├─ schema_org_a (tables: patients, events, ...)
  ├─ schema_org_b (tables: patients, events, ...)
  └─ schema_org_c (tables: patients, events, ...)
```

**Vantagens:**

- ✅ Isolamento bom
- ✅ Um database apenas
- ✅ Backup por schema possível

**Desvantagens:**

- ❌ Limite de schemas no Postgres (~1000)
- ❌ Migrações N vezes
- ❌ Connection pool complexo

### 3. Shared Database + Row-Level Security (✅ Escolhido)

```
Database Único
  └─ Tabelas com tenant_id
     └─ RLS Policies para isolamento
```

**Vantagens:**

- ✅ Escalabilidade (milhares de tenants)
- ✅ Uma migration para todos
- ✅ Analytics cross-tenant fácil
- ✅ Custo otimizado

**Desvantagens:**

- ⚠️ Requer disciplina (sempre filtrar tenant_id)
- ⚠️ Performance pode degradar sem índices corretos
- ⚠️ RLS adiciona overhead mínimo (~5%)

---

## Implementação: Row-Level Security (RLS)

### Conceito

Row-Level Security é um recurso do PostgreSQL que aplica filtros automáticos em queries baseado no contexto do usuário.

```sql
-- Sem RLS
SELECT * FROM patients;
-- Retorna TODOS os pacientes (perigoso!)

-- Com RLS
SELECT * FROM patients;
-- PostgreSQL automaticamente adiciona: WHERE tenant_id = current_tenant()
-- Retorna apenas pacientes do tenant correto
```

### Configuração do Contexto

#### 1. Setar Variáveis de Sessão

```typescript
// packages/backend/src/database/middleware/tenant-context.middleware.ts

import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { db } from "../database/connection";
import { sql } from "drizzle-orm";

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    // Extrai tenant_id do JWT
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;

    if (!tenantId) {
      throw new UnauthorizedException("Tenant ID not found in token");
    }

    // Seta variáveis de sessão para RLS
    await db.execute(sql`
      SELECT set_config('app.current_tenant_id', ${tenantId}, true);
    `);

    await db.execute(sql`
      SELECT set_config('app.current_user_id', ${userId}, true);
    `);

    next();
  }
}
```

#### 2. Aplicar Middleware Globalmente

```typescript
// packages/backend/src/main.ts

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Aplicar tenant context em todas as rotas
  app.use(new TenantContextMiddleware().use);

  await app.listen(3000);
}
```

### Criando Policies

#### Policy 1: Events (Event Store)

```sql
-- Habilitar RLS na tabela
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT
CREATE POLICY events_select_policy ON events
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy para INSERT
CREATE POLICY events_insert_policy ON events
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy para UPDATE (eventos são imutáveis, mas por garantia)
CREATE POLICY events_update_policy ON events
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy para DELETE (normalmente não permitido, mas para admin)
CREATE POLICY events_delete_policy ON events
  FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = current_setting('app.current_user_id', true)::uuid
        AND role = 'super_admin'
    )
  );
```

#### Policy 2: Patient View

```sql
ALTER TABLE patient_view ENABLE ROW LEVEL SECURITY;

CREATE POLICY patient_view_policy ON patient_view
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );
```

#### Policy 3: Appointment View

```sql
ALTER TABLE appointment_view ENABLE ROW LEVEL SECURITY;

-- Usuários veem apenas agendamentos do tenant
CREATE POLICY appointment_view_tenant_policy ON appointment_view
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Usuários de clínicas específicas veem apenas seus agendamentos
CREATE POLICY appointment_view_clinic_policy ON appointment_view
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id
      FROM clinic_users
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
        AND status = 'active'
    )
  );
```

### Bypass de RLS (Admin/System)

```sql
-- Role especial que bypassa RLS
CREATE ROLE healz_admin WITH LOGIN PASSWORD 'secure_password';
ALTER ROLE healz_admin BYPASSRLS;

-- Ou, para operações específicas
SET SESSION AUTHORIZATION healz_admin;
-- queries aqui não têm RLS aplicado
RESET SESSION AUTHORIZATION;
```

---

## Isolamento em Múltiplas Camadas

### Camada 1: Database (RLS)

```sql
-- Automático via policies
SELECT * FROM patients;
-- WHERE tenant_id = current_tenant_id (adicionado automaticamente)
```

### Camada 2: Application (Drizzle)

```typescript
// packages/backend/src/repositories/base.repository.ts

export abstract class BaseRepository<T> {
  constructor(
    protected readonly table: PgTable,
    protected readonly tenantId: string,
  ) {}

  async findAll() {
    // SEMPRE adiciona filtro de tenant
    return db
      .select()
      .from(this.table)
      .where(eq(this.table.tenantId, this.tenantId));
  }

  async findById(id: string) {
    return db
      .select()
      .from(this.table)
      .where(
        and(
          eq(this.table.id, id),
          eq(this.table.tenantId, this.tenantId), // Defesa em profundidade
        ),
      );
  }
}
```

### Camada 3: Domain (Aggregate)

```typescript
// packages/backend/src/domain/aggregates/patient.aggregate.ts

export class Patient {
  constructor(
    private id: UUID,
    private tenantId: UUID,
    // ... outros campos
  ) {}

  // Todos os eventos gerados incluem tenant_id
  register(data: RegisterPatientData): PatientRegistered {
    return new PatientRegistered({
      patient_id: this.id,
      tenant_id: this.tenantId, // ✅ Sempre presente
      phone: data.phone,
      full_name: data.fullName,
    });
  }
}
```

### Camada 4: API (Guards)

```typescript
// packages/backend/src/guards/tenant.guard.ts

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceTenantId = request.params.tenantId;

    // Valida que usuário está acessando recurso do próprio tenant
    if (user.tenantId !== resourceTenantId) {
      throw new ForbiddenException("Access denied to this tenant");
    }

    return true;
  }
}
```

---

## Performance com Multi-tenancy

### Problema: Queries Cross-tenant Lentas

```sql
-- ❌ Query lenta (full table scan)
SELECT * FROM events WHERE event_type = 'PatientRegistered';

-- ✅ Query rápida (usa índice tenant + tipo)
SELECT * FROM events
WHERE tenant_id = 'org-123'
  AND event_type = 'PatientRegistered';
```

### Solução: Índices Compostos com tenant_id

```sql
-- Índice com tenant_id sempre como primeiro campo
CREATE INDEX events_tenant_type_idx
  ON events (tenant_id, event_type, created_at);

CREATE INDEX patient_view_tenant_status_idx
  ON patient_view (tenant_id, status, current_journey_stage);

CREATE INDEX appointment_view_tenant_clinic_date_idx
  ON appointment_view (tenant_id, clinic_id, scheduled_for);
```

### Análise de Query Plan

```sql
-- Verificar se índice está sendo usado
EXPLAIN ANALYZE
SELECT * FROM events
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND event_type = 'PatientRegistered'
  AND created_at >= NOW() - INTERVAL '7 days';

-- Output esperado:
-- Index Scan using events_tenant_type_idx on events (cost=0.42..X rows=Y)
```

### Particionamento por Tenant (Opcional)

**Quando usar**: Quando um tenant representa 30%+ do volume de dados

```sql
-- Criar partições por tenant "grande"
CREATE TABLE events_tenant_large PARTITION OF events
  FOR VALUES IN ('tenant-large-id');

-- Demais tenants ficam na partição default
CREATE TABLE events_default PARTITION OF events DEFAULT;
```

---

## Custos e Escalabilidade

### Modelo de Custos

| Fator                  | Impacto     | Otimização                               |
| ---------------------- | ----------- | ---------------------------------------- |
| **Conexões ao DB**     | Alto        | Connection pooling com PgBouncer         |
| **Tamanho de índices** | Médio       | Índices parciais (apenas dados recentes) |
| **Tabela `events`**    | Alto        | Particionamento após 50M eventos         |
| **Read models**        | Médio       | Caching com Redis                        |
| **RLS overhead**       | Baixo (~5%) | Aceitável para benefício de segurança    |

### Limites de Escalabilidade

| Métrica                     | Limite Testado | Limite Teórico                    |
| --------------------------- | -------------- | --------------------------------- |
| **Tenants**                 | 1.000          | 100.000+                          |
| **Eventos/dia**             | 10 milhões     | 100 milhões (com particionamento) |
| **Pacientes/tenant**        | 50.000         | Ilimitado                         |
| **Consultas ativas/tenant** | 10.000         | Ilimitado                         |

### Quando Considerar Sharding

**Sinais de necessidade:**

- Database > 500 GB
- Queries p95 > 100ms mesmo com índices
- Write throughput > 10.000 events/segundo
- Mais de 100.000 tenants

**Estratégia:**

```
Shard 1: tenants A-H
Shard 2: tenants I-P
Shard 3: tenants Q-Z
```

---

## Hierarquia de Acesso

### Modelo de Permissões

```
┌─────────────────────────────────────────────────────────┐
│                     ORGANIZATION                         │
│                    (Tenant Root)                         │
│                                                          │
│  Roles: admin, manager                                   │
│  Permissions:                                            │
│    - organization.settings.manage                        │
│    - clinics.create, clinics.update                      │
│    - users.invite, users.manage                          │
│    - billing.view, billing.manage                        │
│    - reports.view_all_clinics                            │
│                                                          │
│  ┌────────────────────────┐  ┌────────────────────────┐ │
│  │       CLINIC A         │  │       CLINIC B         │ │
│  │                        │  │                        │ │
│  │ Roles: doctor,         │  │ Roles: receptionist    │ │
│  │        receptionist    │  │                        │ │
│  │                        │  │                        │ │
│  │ Permissions:           │  │ Permissions:           │ │
│  │  - appointments.view   │  │  - appointments.create │ │
│  │  - patients.view       │  │  - patients.view       │ │
│  │  - escalations.manage  │  │                        │ │
│  │                        │  │                        │ │
│  └────────────────────────┘  └────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Implementação de Permissões

```typescript
// packages/backend/src/auth/permissions/permission.decorator.ts

export const RequirePermission = (...permissions: string[]) =>
  SetMetadata("permissions", permissions);

// packages/backend/src/auth/guards/permission.guard.ts

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      "permissions",
      context.getHandler(),
    );

    if (!requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verifica permissões do usuário
    return requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );
  }
}

// Uso em controllers
@Controller("appointments")
export class AppointmentsController {
  @Get()
  @RequirePermission("appointments.view")
  async list() {
    // ...
  }

  @Post()
  @RequirePermission("appointments.create")
  async create(@Body() dto: CreateAppointmentDto) {
    // ...
  }

  @Delete(":id")
  @RequirePermission("appointments.delete")
  async delete(@Param("id") id: string) {
    // ...
  }
}
```

### Permissões Customizadas por Clínica

```typescript
// User pode ter permissões diferentes em cada clínica

// Clínica A: Dr. João é médico
{
  clinicId: 'clinic-a',
  userId: 'user-joao',
  roleId: 'doctor',
  customPermissions: [
    'appointments.view',
    'appointments.create',
    'patients.view',
    'escalations.manage'
  ]
}

// Clínica B: Dr. João é apenas substituto (menos permissões)
{
  clinicId: 'clinic-b',
  userId: 'user-joao',
  roleId: 'guest_doctor',
  customPermissions: [
    'appointments.view',
    'patients.view' // Não pode criar nem escalar
  ]
}
```

---

## Context Switching

### Cenário: Médico Multi-clínica

Dr. João trabalha em 3 clínicas:

- Clínica A (Paulista): Segunda, Quarta, Sexta
- Clínica B (Vila Mariana): Terça, Quinta
- Clínica C (Santo Amaro): Sábado

### Implementação

#### 1. Listar Contextos Disponíveis

```typescript
// GET /auth/contexts

{
  "user_id": "user-joao",
  "available_contexts": [
    {
      "organization_id": "org-cardio-group",
      "organization_name": "Cardio Group",
      "clinic_id": "clinic-a",
      "clinic_name": "Unidade Paulista",
      "role": "doctor",
      "permissions": ["appointments.view", "appointments.create", ...]
    },
    {
      "organization_id": "org-cardio-group",
      "organization_name": "Cardio Group",
      "clinic_id": "clinic-b",
      "clinic_name": "Unidade Vila Mariana",
      "role": "doctor",
      "permissions": ["appointments.view", "appointments.create", ...]
    },
    {
      "organization_id": "org-cardio-group",
      "organization_name": "Cardio Group",
      "clinic_id": "clinic-c",
      "clinic_name": "Unidade Santo Amaro",
      "role": "guest_doctor",
      "permissions": ["appointments.view", "patients.view"]
    }
  ]
}
```

#### 2. Trocar Contexto

```typescript
// POST /auth/switch-context
// Body: { "clinic_id": "clinic-b" }

@Post('switch-context')
async switchContext(
  @User() user: CurrentUser,
  @Body() dto: SwitchContextDto
) {
  // Validar que usuário tem acesso à clínica
  const access = await this.authService.validateClinicAccess(
    user.userId,
    dto.clinicId
  );

  if (!access) {
    throw new ForbiddenException('No access to this clinic');
  }

  // Buscar permissões da nova clínica
  const permissions = await this.authService.getClinicPermissions(
    user.userId,
    dto.clinicId
  );

  // Gerar novo token com novo contexto
  const newToken = this.jwtService.sign({
    user_id: user.userId,
    organization_id: access.organizationId,
    clinic_id: dto.clinicId,
    role: access.role,
    permissions,
  });

  // Auditar troca de contexto
  await this.auditService.log({
    eventType: 'ContextSwitched',
    userId: user.userId,
    fromClinic: user.clinicId,
    toClinic: dto.clinicId,
    timestamp: new Date(),
  });

  return {
    access_token: newToken,
    context: {
      clinic_id: dto.clinicId,
      clinic_name: access.clinicName,
      role: access.role,
      permissions,
    },
  };
}
```

#### 3. JWT Token com Contexto

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "organization_id": "org-cardio-group",
  "clinic_id": "clinic-b",
  "role": "doctor",
  "permissions": [
    "appointments.view",
    "appointments.create",
    "appointments.update",
    "patients.view",
    "escalations.manage"
  ],
  "iat": 1738281600,
  "exp": 1738368000
}
```

### UI: Seletor de Contexto

```typescript
// Frontend: Context Switcher Component

<ContextSwitcher>
  <Select value={currentClinic} onChange={switchClinic}>
    <Option value="clinic-a">
      Unidade Paulista
      <Badge>Doctor</Badge>
    </Option>
    <Option value="clinic-b">
      Unidade Vila Mariana
      <Badge>Doctor</Badge>
    </Option>
    <Option value="clinic-c">
      Unidade Santo Amaro
      <Badge>Guest</Badge>
    </Option>
  </Select>
</ContextSwitcher>
```

---

## Casos Extremos

### Caso 1: Tenant com 100.000 Pacientes

**Problema**: Queries lentas, índices grandes

**Solução**:

```sql
-- 1. Particionamento da patient_view por status
CREATE TABLE patient_view_active PARTITION OF patient_view
  FOR VALUES IN ('active');

CREATE TABLE patient_view_inactive PARTITION OF patient_view
  FOR VALUES IN ('inactive');

-- 2. Índice parcial apenas para ativos
CREATE INDEX patient_view_active_idx ON patient_view (tenant_id, last_interaction_at)
  WHERE status = 'active';

-- 3. Queries sempre filtram por status
SELECT * FROM patient_view
WHERE tenant_id = 'large-tenant'
  AND status = 'active'
  AND current_journey_stage = 'at_risk';
```

### Caso 2: Organização Multi-regional

**Problema**: Latência entre regiões, compliance (dados devem ficar no país)

**Solução**: Database por região com routing

```
US Region → DB us-east-1
EU Region → DB eu-west-1
BR Region → DB sa-east-1

Routing: tenant.region → database_url
```

```typescript
function getDatabaseConnection(tenantId: string) {
  const tenant = tenantsCache.get(tenantId);
  const region = tenant.region; // 'us', 'eu', 'br'

  return databaseConnections[region];
}
```

### Caso 3: Tenant Mal-Intencionado (Rate Limiting)

**Problema**: Tenant faz milhões de requests e degrada sistema

**Solução**: Rate limiting por tenant

```typescript
// packages/backend/src/middleware/rate-limit.middleware.ts

import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimiterByTenant = new RateLimiterMemory({
  points: 1000, // Máximo de requests
  duration: 60, // Por minuto
  keyPrefix: "tenant",
});

@Injectable()
export class TenantRateLimitMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.user?.tenantId;

    try {
      await rateLimiterByTenant.consume(tenantId);
      next();
    } catch (error) {
      res.status(429).json({
        message: "Too many requests",
        retryAfter: error.msBeforeNext / 1000,
      });
    }
  }
}
```

### Caso 4: LGPD - Deletar Dados de Paciente

**Problema**: Event sourcing = dados imutáveis, mas LGPD exige deleção

**Solução**: Criptografia + Right to Erasure

```typescript
// 1. Criptografar dados sensíveis com chave única por paciente
event_data: {
  patient_id: "patient-123",
  phone: encrypt("+5511999999999", patientKey),
  full_name: encrypt("Maria Silva", patientKey),
}

// 2. Para exercer direito ao esquecimento:
// - Deletar a chave de criptografia
// - Dados ficam irrecuperáveis (= deletados)
await deleteEncryptionKey(patientId);

// 3. Manter metadata para analytics (anonimizado)
event_data: {
  patient_id: "anonymized-patient-123",
  phone: "[REDACTED]",
  full_name: "[REDACTED]",
}
```

---

## Testes de Multi-tenancy

### Teste 1: Isolamento de Dados

```typescript
// packages/backend/test/multi-tenant.e2e.spec.ts

describe("Multi-tenant Isolation", () => {
  it("should not access data from other tenant", async () => {
    // Setup: Criar 2 tenants com pacientes
    const tenant1 = await createTenant("Tenant 1");
    const tenant2 = await createTenant("Tenant 2");

    const patient1 = await createPatient(tenant1.id, { name: "Patient 1" });
    const patient2 = await createPatient(tenant2.id, { name: "Patient 2" });

    // Login como usuário do Tenant 1
    const token1 = await login(tenant1.userId);

    // Tentar acessar paciente do Tenant 2
    const response = await request(app.getHttpServer())
      .get(`/patients/${patient2.id}`)
      .set("Authorization", `Bearer ${token1}`);

    // Deve retornar 404 (RLS oculta paciente)
    expect(response.status).toBe(404);
  });

  it("should enforce RLS even with SQL injection attempt", async () => {
    const token = await login(tenant1.userId);

    // Tentar injeção SQL para bypass tenant_id
    const maliciousId = "123' OR tenant_id != tenant_id --";

    const response = await request(app.getHttpServer())
      .get(`/patients/${maliciousId}`)
      .set("Authorization", `Bearer ${token}`);

    // RLS ainda protege
    expect(response.status).toBe(404);
  });
});
```

### Teste 2: Context Switching

```typescript
describe("Context Switching", () => {
  it("should switch context and update permissions", async () => {
    // User com acesso a 2 clínicas
    const user = await createUser();
    await grantClinicAccess(user.id, clinic1.id, "doctor");
    await grantClinicAccess(user.id, clinic2.id, "receptionist");

    // Login inicial (contexto = clinic1)
    const token1 = await login(user.email);
    const decoded1 = jwt.decode(token1);
    expect(decoded1.clinic_id).toBe(clinic1.id);
    expect(decoded1.role).toBe("doctor");

    // Switch para clinic2
    const response = await request(app.getHttpServer())
      .post("/auth/switch-context")
      .set("Authorization", `Bearer ${token1}`)
      .send({ clinic_id: clinic2.id });

    const token2 = response.body.access_token;
    const decoded2 = jwt.decode(token2);

    expect(decoded2.clinic_id).toBe(clinic2.id);
    expect(decoded2.role).toBe("receptionist");
  });
});
```

---

## Monitoramento e Alertas

### Métricas Importantes

```typescript
// Métricas por tenant
- tenant.active_users_count
- tenant.events_per_day
- tenant.api_requests_per_minute
- tenant.database_size_mb
- tenant.read_latency_p95
- tenant.write_latency_p95

// Alertas
- Tenant excedeu quota de eventos
- Tenant com queries lentas (>1s)
- Tenant sem atividade por 30 dias (churn risk)
```

### Dashboard de Tenants

```sql
-- Query para dashboard admin
SELECT
  t.id,
  t.name,
  t.status,
  COUNT(DISTINCT p.id) as total_patients,
  COUNT(DISTINCT c.id) as total_clinics,
  COUNT(DISTINCT e.id) as total_events_30d,
  pg_size_pretty(
    pg_total_relation_size('events') *
    (COUNT(DISTINCT e.id)::float / (SELECT COUNT(*) FROM events))
  ) as estimated_storage
FROM organizations t
LEFT JOIN patients p ON p.tenant_id = t.id
LEFT JOIN clinics c ON c.organization_id = t.id
LEFT JOIN events e ON e.tenant_id = t.id
  AND e.created_at >= NOW() - INTERVAL '30 days'
GROUP BY t.id
ORDER BY total_events_30d DESC;
```

---

## Migração de Tenants

### Cenário: Mover tenant entre databases

```typescript
// Script de migração
async function migrateTenant(
  tenantId: string,
  fromDb: Database,
  toDb: Database,
) {
  console.log(`Migrating tenant ${tenantId}...`);

  // 1. Freeze writes (colocar tenant em manutenção)
  await setTenantStatus(tenantId, "maintenance");

  // 2. Export data
  const events = await fromDb
    .select()
    .from(events)
    .where(eq(events.tenantId, tenantId));

  const readModels = await exportReadModels(fromDb, tenantId);

  // 3. Import to new database
  await toDb.insert(events).values(events);
  await importReadModels(toDb, readModels);

  // 4. Update tenant routing
  await updateTenantRouting(tenantId, toDb.url);

  // 5. Reactivate
  await setTenantStatus(tenantId, "active");

  console.log(`Migration complete for tenant ${tenantId}`);
}
```

---

## Documentação Relacionada

- [MULTI_TENANT.MD](./MULTI_TENANT.MD) - Visão geral da arquitetura
- [DATA_MODELING.md](./DATA_MODELING.md) - Modelagem de dados completa
- [DATABASE.MD](./DATABASE.MD) - Event Store e schemas
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura geral

---

## Status

✅ **Completo** - Documento criado em 2025-01-30

Cobre implementação profunda de multi-tenancy com RLS, isolamento, performance, casos extremos e testes.

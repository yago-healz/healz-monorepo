# Plano 08: Painel de Gerenciamento Admin (Platform Admin)

## Visão Geral

Painel administrativo para a equipe interna da Healz gerenciar todas as organizações, clínicas e usuários da plataforma. Os administradores serão usuários com role especial `platform_admin` que terão acesso total ao sistema.

## Objetivos

1. **Gestão Centralizada**: Visualizar e gerenciar todas as organizações, clínicas e usuários
2. **Suporte Técnico**: Facilitar debugging e suporte aos clientes
3. **Controle de Acesso**: Ativar/desativar entidades conforme necessário
4. **Auditoria**: Monitorar ações e detectar problemas

## Arquitetura de Permissões

### Nova Role: `platform_admin`

Adicionar ao enum de roles existente:

```typescript
// Enum atual: admin, doctor, secretary
// Novo: platform_admin (super usuário da Healz)
```

**Diferenças importantes:**

| Role | Escopo | Acesso |
|------|--------|--------|
| `admin` | Organização específica | Gerencia sua org e clínicas |
| `platform_admin` | Plataforma inteira | Gerencia TODAS as orgs/clínicas/usuários |

### Como Criar Platform Admins

**Opção 1: Script de migração/seed** (Recomendado para primeiros admins)
```bash
pnpm db:seed-admin --email=admin@healz.com --name="Admin Healz"
```

**Opção 2: Endpoint protegido** (Apenas outro platform_admin pode criar)
```
POST /api/platform-admin/admins
```

## Módulos e Funcionalidades

### 1. Autenticação e Autorização

#### 1.1. Guard: `PlatformAdminGuard`

```typescript
// src/guards/platform-admin.guard.ts
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    
    // Buscar se user tem role platform_admin
    const isPlatformAdmin = await db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.userId, user.userId))
      .limit(1);
    
    return isPlatformAdmin.length > 0;
  }
}
```

#### 1.2. Schema: Tabela `platform_admins`

```typescript
export const platformAdmins = pgTable("platform_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  createdBy: uuid("created_by")
    .references(() => users.id), // quem concedeu permissão
  createdAt: timestamp("created_at").defaultNow(),
  revokedAt: timestamp("revoked_at"), // null = ativo, preenchido = revogado
  revokedBy: uuid("revoked_by")
    .references(() => users.id),
});
```

**Nota**: Platform admins ainda têm registro em `userClinicRoles` para poder acessar o sistema normalmente se necessário.

---

### 2. Gerenciamento de Organizações

#### 2.1. Listar Organizações

**Endpoint**: `GET /api/platform-admin/organizations`

**Query Params:**
- `page`: número da página (padrão: 1)
- `limit`: itens por página (padrão: 20, max: 100)
- `search`: busca por nome ou slug
- `status`: `active` | `inactive` | `all` (padrão: active)
- `sortBy`: `createdAt` | `name` | `clinicsCount` | `usersCount`
- `sortOrder`: `asc` | `desc`

**Response:**
```json
{
  "data": [
    {
      "id": "org-uuid",
      "name": "Clínica XYZ",
      "slug": "clinica-xyz",
      "status": "active",
      "createdAt": "2026-01-15T10:00:00Z",
      "stats": {
        "clinicsCount": 3,
        "usersCount": 12,
        "lastActivity": "2026-02-06T15:30:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### 2.2. Ver Detalhes da Organização

**Endpoint**: `GET /api/platform-admin/organizations/:id`

**Response:**
```json
{
  "id": "org-uuid",
  "name": "Clínica XYZ",
  "slug": "clinica-xyz",
  "status": "active",
  "createdAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z",
  "clinics": [
    {
      "id": "clinic-uuid",
      "name": "Unidade Principal",
      "status": "active",
      "usersCount": 8
    }
  ],
  "admins": [
    {
      "userId": "user-uuid",
      "name": "Dr. João Silva",
      "email": "joao@clinica-xyz.com"
    }
  ],
  "stats": {
    "totalUsers": 12,
    "totalClinics": 3,
    "lastLogin": "2026-02-06T15:30:00Z"
  }
}
```

#### 2.3. Criar Organização Manualmente

**Endpoint**: `POST /api/platform-admin/organizations`

**Request:**
```json
{
  "name": "Nova Clínica ABC",
  "slug": "nova-clinica-abc",
  "initialClinic": {
    "name": "Unidade Principal"
  },
  "initialAdmin": {
    "name": "Dr. Maria Santos",
    "email": "maria@abc.com",
    "sendInvite": true // se true, envia email de convite
  }
}
```

**Response:** (201 Created)
```json
{
  "organization": { "id": "...", "name": "...", ... },
  "clinic": { "id": "...", "name": "..." },
  "invite": {
    "email": "maria@abc.com",
    "token": "...",
    "expiresAt": "..."
  }
}
```

#### 2.4. Editar Organização

**Endpoint**: `PATCH /api/platform-admin/organizations/:id`

**Request:**
```json
{
  "name": "Novo Nome",
  "slug": "novo-slug"
}
```

#### 2.5. Desativar/Ativar Organização

**Endpoint**: `PATCH /api/platform-admin/organizations/:id/status`

**Request:**
```json
{
  "status": "inactive", // ou "active"
  "reason": "Inadimplência" // opcional, para auditoria
}
```

**Comportamento:**
- Desativa TODAS as clínicas da organização
- Usuários não conseguem fazer login (guard bloqueia)
- Dados permanecem no banco (não deleta)

---

### 3. Gerenciamento de Clínicas

#### 3.1. Listar Clínicas

**Endpoint**: `GET /api/platform-admin/clinics`

**Query Params:**
- `page`, `limit`, `search`, `status`, `sortBy`, `sortOrder` (similar a organizations)
- `organizationId`: filtrar por organização específica

**Response:**
```json
{
  "data": [
    {
      "id": "clinic-uuid",
      "name": "Unidade Centro",
      "organization": {
        "id": "org-uuid",
        "name": "Clínica XYZ",
        "slug": "clinica-xyz"
      },
      "status": "active",
      "usersCount": 5,
      "createdAt": "2026-01-20T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### 3.2. Ver Detalhes da Clínica

**Endpoint**: `GET /api/platform-admin/clinics/:id`

**Response:**
```json
{
  "id": "clinic-uuid",
  "name": "Unidade Centro",
  "organization": {
    "id": "org-uuid",
    "name": "Clínica XYZ"
  },
  "status": "active",
  "members": [
    {
      "userId": "user-uuid",
      "name": "Dr. João Silva",
      "email": "joao@example.com",
      "role": "admin",
      "joinedAt": "2026-01-20T10:00:00Z"
    }
  ],
  "createdAt": "2026-01-20T10:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

#### 3.3. Criar Clínica Manualmente

**Endpoint**: `POST /api/platform-admin/clinics`

**Request:**
```json
{
  "organizationId": "org-uuid",
  "name": "Nova Unidade Sul",
  "initialAdminId": "user-uuid" // usuário que será admin (deve pertencer à org)
}
```

#### 3.4. Editar Clínica

**Endpoint**: `PATCH /api/platform-admin/clinics/:id`

**Request:**
```json
{
  "name": "Novo Nome da Clínica"
}
```

#### 3.5. Transferir Clínica para Outra Organização

**Endpoint**: `PATCH /api/platform-admin/clinics/:id/transfer`

**Request:**
```json
{
  "targetOrganizationId": "org-uuid",
  "keepUsers": false // se true, mantém usuários; se false, remove todos
}
```

**Use Case:** Cliente migra de uma organização para outra (ex: fusão de empresas)

#### 3.6. Desativar/Ativar Clínica

**Endpoint**: `PATCH /api/platform-admin/clinics/:id/status`

**Request:**
```json
{
  "status": "inactive",
  "reason": "Unidade fechada temporariamente"
}
```

---

### 4. Gerenciamento de Usuários

#### 4.1. Listar Usuários

**Endpoint**: `GET /api/platform-admin/users`

**Query Params:**
- `page`, `limit`, `search` (busca por nome ou email)
- `organizationId`: filtrar por organização
- `clinicId`: filtrar por clínica
- `role`: filtrar por role
- `emailVerified`: `true` | `false` | `all`
- `status`: `active` | `inactive` | `all`

**Response:**
```json
{
  "data": [
    {
      "id": "user-uuid",
      "name": "Dr. João Silva",
      "email": "joao@example.com",
      "emailVerified": true,
      "status": "active",
      "createdAt": "2026-01-15T10:00:00Z",
      "clinics": [
        {
          "clinicId": "clinic-uuid",
          "clinicName": "Unidade Centro",
          "organizationName": "Clínica XYZ",
          "role": "admin"
        }
      ]
    }
  ],
  "pagination": { ... }
}
```

#### 4.2. Ver Detalhes do Usuário

**Endpoint**: `GET /api/platform-admin/users/:id`

**Response:**
```json
{
  "id": "user-uuid",
  "name": "Dr. João Silva",
  "email": "joao@example.com",
  "emailVerified": true,
  "emailVerifiedAt": "2026-01-15T11:00:00Z",
  "status": "active",
  "createdAt": "2026-01-15T10:00:00Z",
  "lastLoginAt": "2026-02-06T15:30:00Z",
  "clinics": [
    {
      "clinicId": "clinic-uuid",
      "clinicName": "Unidade Centro",
      "organizationId": "org-uuid",
      "organizationName": "Clínica XYZ",
      "role": "admin",
      "joinedAt": "2026-01-15T10:00:00Z"
    }
  ],
  "recentActivity": [
    {
      "action": "LOGIN",
      "resource": "/api/auth/login",
      "ip": "192.168.1.1",
      "createdAt": "2026-02-06T15:30:00Z"
    }
  ]
}
```

#### 4.3. Criar Usuário Manualmente

**Endpoint**: `POST /api/platform-admin/users`

**Request:**
```json
{
  "name": "Dr. Carlos Souza",
  "email": "carlos@example.com",
  "clinicId": "clinic-uuid",
  "role": "doctor",
  "sendInvite": true // se true, envia email de convite; se false, define senha
  "password": "senha123" // obrigatório se sendInvite = false
}
```

**Comportamento:**
- Se `sendInvite = true`: cria convite e envia email
- Se `sendInvite = false`: cria usuário com senha definida (útil para migrações)

#### 4.4. Editar Usuário

**Endpoint**: `PATCH /api/platform-admin/users/:id`

**Request:**
```json
{
  "name": "Dr. João Silva Atualizado",
  "email": "novo-email@example.com"
}
```

**Validações:**
- Se mudar email, marca `emailVerified = false` e envia novo email de verificação

#### 4.5. Resetar Senha do Usuário

**Endpoint**: `POST /api/platform-admin/users/:id/reset-password`

**Request:**
```json
{
  "sendEmail": true // se true, envia link de reset; se false, retorna senha temporária
}
```

**Response (se sendEmail = false):**
```json
{
  "temporaryPassword": "Abc123xyz!",
  "message": "Senha temporária gerada. Usuário deve alterá-la no primeiro login."
}
```

**Use Case:** Cliente liga no suporte esquecendo senha

#### 4.6. Forçar Verificação de Email

**Endpoint**: `POST /api/platform-admin/users/:id/verify-email`

**Response:**
```json
{
  "message": "Email marcado como verificado"
}
```

**Use Case:** Suporte verifica manualmente a identidade do cliente

#### 4.7. Gerenciar Clínicas do Usuário

**Adicionar a clínica:**
`POST /api/platform-admin/users/:userId/clinics`
```json
{
  "clinicId": "clinic-uuid",
  "role": "doctor"
}
```

**Atualizar role:**
`PATCH /api/platform-admin/users/:userId/clinics/:clinicId`
```json
{
  "role": "admin"
}
```

**Remover de clínica:**
`DELETE /api/platform-admin/users/:userId/clinics/:clinicId`

#### 4.8. Desativar/Ativar Usuário

**Endpoint**: `PATCH /api/platform-admin/users/:id/status`

**Request:**
```json
{
  "status": "inactive",
  "reason": "Solicitação do cliente",
  "revokeTokens": true // se true, faz logout forçado
}
```

**Comportamento:**
- Marca usuário como inativo
- Se `revokeTokens = true`: revoga todos os refresh tokens (logout forçado)
- Usuário não consegue fazer login enquanto inativo

---

### 5. Funcionalidade de Suporte

#### 5.1. "Login As" (Impersonation)

**Endpoint**: `POST /api/platform-admin/users/:id/impersonate`

**Response:**
```json
{
  "accessToken": "eyJ...",
  "user": { ... }
}
```

**Comportamento:**
- Gera access token **como se fosse o usuário**
- Admin pode acessar sistema na perspectiva do usuário
- **Importante**: Logar na auditoria que X admin se passou por Y usuário

**Auditoria:**
```json
{
  "action": "IMPERSONATE",
  "userId": "admin-user-id",
  "metadata": {
    "targetUserId": "user-id",
    "targetUserEmail": "user@example.com"
  }
}
```

**Segurança:**
- Apenas platform_admins podem usar
- Logar SEMPRE na auditoria
- Token gerado tem expiração curta (5 minutos?)
- Considerar exibir banner no frontend: "Você está visualizando como [nome]"

#### 5.2. Ver Logs de Auditoria de um Usuário

**Endpoint**: `GET /api/platform-admin/users/:id/audit-logs`

**Query Params:**
- `page`, `limit`
- `action`: filtrar por ação específica
- `dateFrom`, `dateTo`: filtro por período

**Response:**
```json
{
  "data": [
    {
      "id": "log-uuid",
      "action": "LOGIN",
      "resource": "/api/auth/login",
      "method": "POST",
      "statusCode": 200,
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-02-06T15:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### 5.3. Revogar Todas as Sessões do Usuário

**Endpoint**: `POST /api/platform-admin/users/:id/revoke-sessions`

**Response:**
```json
{
  "message": "Todas as sessões foram revogadas",
  "revokedCount": 3
}
```

**Use Case:** Usuário reporta dispositivo roubado

---

### 6. Auditoria e Monitoramento

#### 6.1. Dashboard de Métricas

**Endpoint**: `GET /api/platform-admin/dashboard`

**Response:**
```json
{
  "overview": {
    "totalOrganizations": 150,
    "totalClinics": 420,
    "totalUsers": 1250,
    "activeUsers30d": 980
  },
  "growth": {
    "newOrganizationsThisMonth": 12,
    "newUsersThisMonth": 45
  },
  "health": {
    "organizationsWithIssues": 2,
    "inactiveOrganizations": 5
  }
}
```

#### 6.2. Logs de Auditoria Global

**Endpoint**: `GET /api/platform-admin/audit-logs`

**Query Params:**
- `page`, `limit`
- `userId`: filtrar por usuário
- `organizationId`: filtrar por organização
- `action`: filtrar por ação
- `dateFrom`, `dateTo`
- `ip`: filtrar por IP específico

**Response:** Similar ao endpoint de logs por usuário, mas global

#### 6.3. Atividades Suspeitas

**Endpoint**: `GET /api/platform-admin/suspicious-activities`

**Critérios automáticos:**
- Múltiplas tentativas de login falhas (5+ em 1 hora)
- Login de IPs diferentes em curto período (< 5 minutos)
- Detecção de token reuse
- Alteração de senha múltiplas vezes em curto período

**Response:**
```json
{
  "data": [
    {
      "userId": "user-uuid",
      "userName": "Dr. João Silva",
      "type": "multiple_failed_logins",
      "severity": "medium",
      "details": "5 tentativas de login falhas em 1 hora",
      "lastOccurrence": "2026-02-06T15:30:00Z",
      "ip": "192.168.1.1"
    }
  ]
}
```

---

### 7. Gerenciamento de Platform Admins

#### 7.1. Listar Platform Admins

**Endpoint**: `GET /api/platform-admin/admins`

**Response:**
```json
{
  "data": [
    {
      "id": "admin-uuid",
      "user": {
        "id": "user-uuid",
        "name": "Admin Healz",
        "email": "admin@healz.com"
      },
      "createdBy": {
        "id": "creator-uuid",
        "name": "Super Admin"
      },
      "createdAt": "2026-01-01T10:00:00Z",
      "status": "active"
    }
  ]
}
```

#### 7.2. Criar Novo Platform Admin

**Endpoint**: `POST /api/platform-admin/admins`

**Request:**
```json
{
  "userId": "user-uuid" // usuário existente que será promovido
}
```

**Validações:**
- Apenas platform_admins podem criar outros admins
- Usuário não pode já ser platform_admin

#### 7.3. Revogar Permissões de Admin

**Endpoint**: `DELETE /api/platform-admin/admins/:id`

**Comportamento:**
- Marca `revokedAt = now()`
- Registra quem revogou
- Admin continua sendo usuário normal, mas perde acesso ao painel

---

## Estrutura de Módulos

### PlatformAdmin Module

```
src/platform-admin/
├── platform-admin.module.ts
├── controllers/
│   ├── platform-admin-organizations.controller.ts
│   ├── platform-admin-clinics.controller.ts
│   ├── platform-admin-users.controller.ts
│   ├── platform-admin-audit.controller.ts
│   └── platform-admin-dashboard.controller.ts
├── services/
│   ├── platform-admin-organizations.service.ts
│   ├── platform-admin-clinics.service.ts
│   ├── platform-admin-users.service.ts
│   ├── platform-admin-audit.service.ts
│   └── platform-admin-impersonation.service.ts
├── dto/
│   ├── organizations/
│   │   ├── list-organizations.dto.ts
│   │   ├── create-organization.dto.ts
│   │   └── update-organization.dto.ts
│   ├── clinics/
│   │   ├── list-clinics.dto.ts
│   │   ├── create-clinic.dto.ts
│   │   └── transfer-clinic.dto.ts
│   └── users/
│       ├── list-users.dto.ts
│       ├── create-user.dto.ts
│       └── update-user.dto.ts
└── guards/
    └── platform-admin.guard.ts
```

---

## Schema Changes

### 1. Tabela `platform_admins`

```typescript
export const platformAdmins = pgTable("platform_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  createdBy: uuid("created_by")
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  revokedAt: timestamp("revoked_at"),
  revokedBy: uuid("revoked_by")
    .references(() => users.id),
});

// Índices
// - userId (unique)
// - revokedAt (para filtrar apenas ativos)
```

### 2. Adicionar `status` nas tabelas existentes

```typescript
// organizations
status: varchar("status", { length: 20 }).default("active").notNull(),
// valores: active, inactive

// clinics
status: varchar("status", { length: 20 }).default("active").notNull(),

// users
status: varchar("status", { length: 20 }).default("active").notNull(),
deactivatedAt: timestamp("deactivated_at"),
deactivatedBy: uuid("deactivated_by").references(() => users.id),
deactivationReason: text("deactivation_reason"),
```

### 3. Adicionar `lastLoginAt` em users

```typescript
lastLoginAt: timestamp("last_login_at"),
```

**Atualizar em:** `AuthService.login()` após login bem-sucedido

---

## Migrations

### Migration: Add Platform Admin Support

```sql
-- Criar tabela platform_admins
CREATE TABLE platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id)
);

CREATE INDEX idx_platform_admins_user_id ON platform_admins(user_id);
CREATE INDEX idx_platform_admins_revoked_at ON platform_admins(revoked_at);

-- Adicionar status às tabelas existentes
ALTER TABLE organizations 
  ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;

ALTER TABLE clinics 
  ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;

ALTER TABLE users 
  ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL,
  ADD COLUMN deactivated_at TIMESTAMP,
  ADD COLUMN deactivated_by UUID REFERENCES users(id),
  ADD COLUMN deactivation_reason TEXT,
  ADD COLUMN last_login_at TIMESTAMP;

CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_clinics_status ON clinics(status);
CREATE INDEX idx_users_status ON users(status);
```

---

## Ordem de Implementação

### Fase 1: Setup e Permissões (2-3 horas)
1. ✅ Criar migration para `platform_admins` e campos de status
2. ✅ Rodar migration
3. ✅ Criar schema Drizzle
4. ✅ Implementar `PlatformAdminGuard`
5. ✅ Criar script/seed para primeiro admin
6. ✅ Testar autenticação como platform_admin

### Fase 2: Gerenciamento de Organizações (3-4 horas)
7. ✅ Implementar DTOs (list, create, update)
8. ✅ Implementar service
9. ✅ Implementar controller
10. ✅ Adicionar rate limiting
11. ✅ Testar CRUD completo

### Fase 3: Gerenciamento de Clínicas (3-4 horas)
12. ✅ Implementar DTOs
13. ✅ Implementar service (incluindo transferência)
14. ✅ Implementar controller
15. ✅ Testar CRUD e transferência

### Fase 4: Gerenciamento de Usuários (4-5 horas)
16. ✅ Implementar DTOs
17. ✅ Implementar service
18. ✅ Implementar controller
19. ✅ Implementar reset de senha admin
20. ✅ Implementar gerenciamento de clínicas do usuário
21. ✅ Testar CRUD completo

### Fase 5: Funcionalidades de Suporte (2-3 horas)
22. ✅ Implementar impersonation service
23. ✅ Implementar endpoint de impersonate
24. ✅ Implementar revoke sessions
25. ✅ Testar impersonation e auditoria

### Fase 6: Auditoria e Dashboard (2-3 horas)
26. ✅ Implementar dashboard service
27. ✅ Implementar audit logs global
28. ✅ Implementar detecção de atividades suspeitas
29. ✅ Testar métricas

### Fase 7: Gerenciamento de Admins (1-2 horas)
30. ✅ Implementar CRUD de platform_admins
31. ✅ Testar criar/revogar admins

### Fase 8: Guards e Validações (2-3 horas)
32. ✅ Adicionar guard para bloquear login de usuários/orgs inativos
33. ✅ Atualizar AuthService para verificar status
34. ✅ Testar bloqueios

### Fase 9: Testes e Documentação (3-4 horas)
35. ✅ Testes unitários
36. ✅ Testes e2e
37. ✅ Documentar endpoints no README
38. ✅ Criar exemplos de uso

**Total estimado: 22-30 horas**

---

## Considerações de Segurança

### 1. Autenticação e Autorização
- ✅ Apenas platform_admins têm acesso aos endpoints `/api/platform-admin/*`
- ✅ Guard verifica role em TODAS as requisições
- ✅ Auditoria registra TODAS as ações de admins

### 2. Impersonation
- ⚠️ **CRÍTICO**: Sempre logar quando admin se passa por usuário
- ✅ Token de impersonation com expiração curta (5 min)
- ✅ Exibir claramente no frontend quando em modo impersonation
- ✅ Não permitir ações críticas em modo impersonation (ex: deletar dados)

### 3. Desativação de Entidades
- ✅ Soft delete (status = inactive) ao invés de DELETE físico
- ✅ Sempre registrar motivo da desativação
- ✅ Manter dados para auditoria e possível reativação

### 4. Rate Limiting
- Endpoints admin têm rate limiting mais relaxado (são poucos usuários)
- Exemplo: 100 req/min para endpoints GET, 30 req/min para POST/PATCH/DELETE

### 5. Proteção contra Abuso
- Logar TODAS as ações de platform_admins
- Alertar se admin fizer muitas ações em curto período (automação?)
- Considerar requerer confirmação para ações críticas (deletar org, etc.)

---

## Notificações e Comunicação

### Quando Notificar Usuários?

#### 1. Alterações feitas pelo Admin

**Cenários que exigem notificação:**
- ✅ Organização desativada → Email para todos os admins da org
- ✅ Clínica desativada → Email para admins da clínica
- ✅ Usuário desativado → Email para o usuário
- ✅ Senha resetada por admin → Email para o usuário
- ✅ Email alterado por admin → Email para ambos os emails (antigo e novo)
- ✅ Usuário adicionado manualmente → Email de boas-vindas

#### 2. Notificações para Admins da Healz

**Cenários que exigem alerta interno:**
- ⚠️ Nova organização criada (signup) → Notificar equipe comercial
- ⚠️ Atividade suspeita detectada → Notificar equipe de segurança
- ⚠️ Erro crítico no sistema → Notificar equipe técnica

### Implementação de Notificações

#### Service: NotificationService

```
src/notifications/
├── notifications.module.ts
├── notifications.service.ts
└── templates/
    ├── org-deactivated.template.ts
    ├── user-deactivated.template.ts
    ├── password-reset-by-admin.template.ts
    └── email-changed-by-admin.template.ts
```

**Exemplo:**
```typescript
// platform-admin-users.service.ts
async deactivateUser(userId: string, adminId: string, reason: string) {
  // ... lógica de desativação ...
  
  // Enviar notificação
  await this.notificationsService.sendUserDeactivatedEmail(user, reason);
  
  // Logar auditoria
  await this.auditService.log({
    userId: adminId,
    action: 'USER_DEACTIVATED',
    metadata: { targetUserId: userId, reason }
  });
}
```

### Templates de Email

#### 1. Organização Desativada
**Assunto:** Sua organização foi desativada - Healz

**Corpo:**
```
Olá,

Sua organização "{OrganizationName}" foi temporariamente desativada.

Motivo: {Reason}

Para mais informações, entre em contato conosco:
Email: suporte@healz.com
Telefone: (XX) XXXX-XXXX

Atenciosamente,
Equipe Healz
```

#### 2. Usuário Desativado
**Assunto:** Sua conta foi desativada - Healz

**Corpo:**
```
Olá {UserName},

Sua conta no Healz foi temporariamente desativada.

Motivo: {Reason}

Se você acredita que isso foi um erro, entre em contato conosco.

Atenciosamente,
Equipe Healz
```

#### 3. Senha Resetada por Admin
**Assunto:** Sua senha foi resetada - Healz

**Corpo:**
```
Olá {UserName},

Sua senha foi resetada por nossa equipe de suporte.

Use o link abaixo para definir uma nova senha:
{ResetLink}

Este link expira em 1 hora.

Se você não solicitou esta alteração, entre em contato conosco imediatamente.

Atenciosamente,
Equipe Healz
```

---

## Frontend Considerations

### Rotas Sugeridas

```
/admin                          → Dashboard
/admin/organizations            → Lista de organizações
/admin/organizations/:id        → Detalhes da organização
/admin/clinics                  → Lista de clínicas
/admin/clinics/:id              → Detalhes da clínica
/admin/users                    → Lista de usuários
/admin/users/:id                → Detalhes do usuário
/admin/audit-logs               → Logs de auditoria
/admin/suspicious-activities    → Atividades suspeitas
/admin/admins                   → Gerenciar platform admins
```

### UI Components Necessários

1. **Tabelas com filtros avançados** (organizations, clinics, users)
2. **Formulários de edição** com validação
3. **Modais de confirmação** para ações críticas
4. **Badge de status** (active/inactive)
5. **Timeline de auditoria** (histórico de ações)
6. **Banner de impersonation** (quando admin está como outro usuário)
7. **Dashboard com cards de métricas**

### Permissões no Frontend

```typescript
// hooks/useIsPlatformAdmin.ts
export function useIsPlatformAdmin() {
  const { user } = useAuth();
  return user?.isPlatformAdmin || false;
}

// Proteger rotas
<Route path="/admin/*" element={
  <RequirePlatformAdmin>
    <AdminLayout />
  </RequirePlatformAdmin>
} />
```

---

## Testes Manuais

### 1. Criar Primeiro Platform Admin (Seed)

```bash
# Script de seed
pnpm db:seed-admin --email=admin@healz.com --name="Admin Healz" --password="senha123"
```

### 2. Login como Platform Admin

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@healz.com",
    "password": "senha123"
  }'
```

### 3. Listar Organizações

```bash
curl -X GET "http://localhost:3001/api/platform-admin/organizations?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 4. Criar Organização Manualmente

```bash
curl -X POST http://localhost:3001/api/platform-admin/organizations \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Clínica Criada por Admin",
    "slug": "clinica-admin",
    "initialClinic": { "name": "Unidade 1" },
    "initialAdmin": {
      "name": "Dr. Teste",
      "email": "teste@example.com",
      "sendInvite": true
    }
  }'
```

### 5. Desativar Usuário

```bash
curl -X PATCH http://localhost:3001/api/platform-admin/users/$USER_ID/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive",
    "reason": "Teste de desativação",
    "revokeTokens": true
  }'
```

### 6. Impersonate User

```bash
curl -X POST http://localhost:3001/api/platform-admin/users/$USER_ID/impersonate \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Resposta: accessToken como se fosse o usuário
```

### 7. Ver Logs de Auditoria

```bash
curl -X GET "http://localhost:3001/api/platform-admin/audit-logs?page=1&limit=50&action=LOGIN" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Próximos Passos (Futuro)

### Melhorias Fase 2

1. **Relatórios e Analytics**
   - Gráficos de crescimento (novos signups, usuários ativos)
   - Métricas de uso (logins por dia, features mais usadas)
   - Exportar relatórios em CSV/PDF

2. **Billing e Assinaturas**
   - Gerenciar planos (free, basic, premium)
   - Associar organização a plano
   - Ver histórico de pagamentos
   - Suspender org por inadimplência

3. **Suporte Avançado**
   - Chat interno com clientes
   - Sistema de tickets
   - Base de conhecimento

4. **Automações**
   - Email automático após X dias sem login
   - Desativar orgs inativos automaticamente
   - Alertas de uso suspeito

5. **Logs e Debugging**
   - Ver logs de aplicação em tempo real
   - Filtrar erros por organização
   - Replay de requisições

---

## Conclusão

Este painel administrativo fornece à equipe Healz controle total sobre a plataforma, permitindo:

✅ **Gestão completa** de organizações, clínicas e usuários  
✅ **Suporte eficiente** com impersonation e logs detalhados  
✅ **Segurança robusta** com auditoria de todas as ações  
✅ **Escalabilidade** para crescer com a plataforma  

O sistema foi projetado para ser **seguro** (todos os acessos auditados), **flexível** (soft deletes permitem recuperação) e **útil** (admins podem resolver problemas rapidamente).

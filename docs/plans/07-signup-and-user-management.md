# Plano 07: Signup e Gerenciamento de Usuários

## Visão Geral

Implementar endpoints para criação de organizações, clínicas e usuários, suportando dois fluxos distintos:

1. **Signup B2B (Empresa nova)**: Empresa contrata o produto e cria conta pela primeira vez
2. **Signup por convite (Médico/funcionário)**: Médico/funcionário recebe convite e cria conta em organização existente

## Fluxos de Negócio

### Fluxo 1: B2B Signup (Empresa Nova)

```
Usuário preenche formulário de signup
     ↓
POST /api/signup
     ↓
Cria (em transação):
  - Organization
  - Primeira Clinic
  - User (role: admin)
  - UserClinicRole (vincula user à clinic como admin)
     ↓
Retorna accessToken + refreshToken (auto-login)
```

**Características:**
- Endpoint público (sem autenticação)
- Cria tudo em uma transação atômica
- Primeiro usuário automaticamente vira admin
- Auto-login após signup (retorna tokens)
- Envia email de verificação automaticamente

### Fluxo 2: Signup por Convite (Médico/Funcionário)

```
Admin da organização
     ↓
POST /api/invites (envia convite por email)
     ↓
Cria registro em invites table
     ↓
Envia email com link: {FRONTEND_URL}/accept-invite?token={token}
     ↓
Usuário clica no link
     ↓
POST /api/invites/accept (aceita convite)
     ↓
Cria:
  - User
  - UserClinicRole (vincula à clinic com role do convite)
     ↓
Retorna accessToken + refreshToken (auto-login)
```

**Características:**
- Convite expira em 7 dias
- Convite é de uso único (marcado como usado após aceite)
- Usuário define sua própria senha ao aceitar
- Auto-login após aceitar convite

### Fluxo 3: Criar Nova Clínica

```
Admin da organização
     ↓
POST /api/organizations/:organizationId/clinics
     ↓
Valida se usuário é admin da organização
     ↓
Cria nova clinic vinculada à org
     ↓
Automaticamente adiciona o criador como admin da nova clinic
```

### Fluxo 4: Adicionar Usuário Existente a Clínica

```
Admin da org ou clinic
     ↓
POST /api/clinics/:clinicId/members
     ↓
Valida se usuário já existe
     ↓
Cria UserClinicRole (vincula user à clinic com role especificado)
```

## Estrutura de Endpoints

### 1. POST /api/signup (Público)

**Request Body:**
```json
{
  "organization": {
    "name": "Clínica XYZ",
    "slug": "clinica-xyz"
  },
  "clinic": {
    "name": "Unidade Principal"
  },
  "user": {
    "name": "Dr. João Silva",
    "email": "joao@clinica-xyz.com",
    "password": "senha123"
  }
}
```

**Response:** (201 Created)
```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "joao@clinica-xyz.com",
    "name": "Dr. João Silva",
    "emailVerified": false,
    "activeClinic": {
      "id": "clinic-uuid",
      "name": "Unidade Principal",
      "organizationId": "org-uuid",
      "role": "admin"
    },
    "availableClinics": [...]
  },
  "organization": {
    "id": "org-uuid",
    "name": "Clínica XYZ",
    "slug": "clinica-xyz"
  }
}
```

**Validações:**
- Email único (não pode já estar cadastrado)
- Slug único (não pode já estar em uso)
- Senha forte (mínimo 8 caracteres)
- Nome da organização obrigatório
- Nome da clínica obrigatório

**Processo:**
1. Validar dados de entrada
2. Verificar se email já existe (retornar erro se sim)
3. Verificar se slug já existe (retornar erro se sim)
4. Iniciar transação DB
5. Hash da senha (bcrypt)
6. Criar organization
7. Criar clinic vinculada à organization
8. Criar user
9. Criar userClinicRole (user como admin da clinic)
10. Commit da transação
11. Gerar emailVerificationToken e enviar email (fire-and-forget)
12. Gerar accessToken e refreshToken
13. Retornar resposta com tokens

**Rate Limit:** 3 requisições por minuto (prevenir spam de criação de contas)

---

### 2. POST /api/invites (Autenticado - Apenas Admins)

**Request Body:**
```json
{
  "email": "medico@example.com",
  "name": "Dr. Maria Santos",
  "clinicId": "clinic-uuid",
  "role": "doctor"
}
```

**Response:** (201 Created)
```json
{
  "message": "Convite enviado com sucesso",
  "invite": {
    "id": "invite-uuid",
    "email": "medico@example.com",
    "clinicId": "clinic-uuid",
    "role": "doctor",
    "expiresAt": "2026-02-14T10:00:00Z"
  }
}
```

**Validações:**
- Email não pode já estar cadastrado
- Usuário autenticado deve ser admin da organização que possui a clinic
- Role deve ser válido: admin, doctor, secretary
- Clinic deve existir e pertencer à organização do admin

**Processo:**
1. Validar se usuário autenticado é admin da org
2. Validar se email já existe (retornar erro se sim)
3. Validar se clinic pertence à mesma org do admin
4. Gerar token aleatório (32 bytes hex)
5. Criar registro em invites table
6. Enviar email com link: `{FRONTEND_URL}/accept-invite?token={token}`
7. Retornar resposta

**Rate Limit:** 10 requisições por minuto

---

### 3. POST /api/invites/accept (Público - Requer token válido)

**Request Body:**
```json
{
  "token": "token-from-email",
  "password": "senha123"
}
```

**Response:** (200 OK)
```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "medico@example.com",
    "name": "Dr. Maria Santos",
    "emailVerified": false,
    "activeClinic": {
      "id": "clinic-uuid",
      "name": "Unidade Principal",
      "organizationId": "org-uuid",
      "role": "doctor"
    },
    "availableClinics": [...]
  }
}
```

**Validações:**
- Token deve existir e não estar expirado (7 dias)
- Token não pode já ter sido usado
- Senha forte (mínimo 8 caracteres)

**Processo:**
1. Buscar invite por token
2. Validar se não expirou (expiresAt)
3. Validar se não foi usado (usedAt === null)
4. Iniciar transação DB
5. Hash da senha
6. Criar user (com name e email do invite)
7. Criar userClinicRole (vincula à clinic com role do invite)
8. Marcar invite como usado (usedAt = now())
9. Commit da transação
10. Gerar emailVerificationToken e enviar email (fire-and-forget)
11. Gerar accessToken e refreshToken
12. Retornar resposta com tokens

**Rate Limit:** 5 requisições por minuto

---

### 4. POST /api/organizations/:organizationId/clinics (Autenticado - Apenas Org Admins)

**Request Body:**
```json
{
  "name": "Unidade Centro"
}
```

**Response:** (201 Created)
```json
{
  "id": "clinic-uuid",
  "name": "Unidade Centro",
  "organizationId": "org-uuid",
  "createdAt": "2026-02-07T10:00:00Z"
}
```

**Validações:**
- Usuário autenticado deve ser admin da organização
- Nome da clínica obrigatório
- Organização deve existir

**Processo:**
1. Validar se org existe
2. Validar se usuário autenticado é admin da org
3. Criar clinic vinculada à org
4. Criar userClinicRole (vincula criador como admin da nova clinic)
5. Retornar clinic criada

**Rate Limit:** 10 requisições por minuto

---

### 5. POST /api/clinics/:clinicId/members (Autenticado - Apenas Admins da Org ou Clinic)

**Request Body:**
```json
{
  "userId": "user-uuid",
  "role": "secretary"
}
```

**Response:** (201 Created)
```json
{
  "message": "Usuário adicionado à clínica com sucesso",
  "member": {
    "userId": "user-uuid",
    "clinicId": "clinic-uuid",
    "role": "secretary"
  }
}
```

**Validações:**
- Usuário autenticado deve ser admin da org ou da clinic
- User deve existir
- User não pode já estar vinculado à clinic
- Role deve ser válido
- Clinic deve existir

**Processo:**
1. Validar se clinic existe
2. Validar se user existe
3. Validar se usuário autenticado é admin da org ou clinic
4. Validar se user já não está vinculado à clinic
5. Criar userClinicRole
6. Retornar resposta

**Rate Limit:** 10 requisições por minuto

---

## Schema Changes

### Nova Tabela: invites

```typescript
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  clinicId: uuid("clinic_id")
    .references(() => clinics.id)
    .notNull(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  role: userRoleEnum("role").notNull(),
  invitedBy: uuid("invited_by")
    .references(() => users.id)
    .notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"), // null = não usado, preenchido = já aceito
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Índices:**
- `token` (unique) - busca rápida por token
- `email` - busca por convites de um email
- `clinicId` - listar convites de uma clínica
- `organizationId` - listar convites de uma organização

---

## Estrutura de Módulos

### 1. Signup Module

**Arquivos:**
```
src/signup/
  ├── signup.module.ts
  ├── signup.controller.ts
  ├── signup.service.ts
  └── dto/
      ├── signup.dto.ts
      └── signup-response.dto.ts
```

**signup.service.ts:**
- `signup(dto: SignupDto): Promise<SignupResponse>`
  - Validar dados
  - Criar organization, clinic, user, userClinicRole em transação
  - Enviar email de verificação
  - Gerar tokens

### 2. Invites Module

**Arquivos:**
```
src/invites/
  ├── invites.module.ts
  ├── invites.controller.ts
  ├── invites.service.ts
  └── dto/
      ├── send-invite.dto.ts
      ├── accept-invite.dto.ts
      └── invite-response.dto.ts
```

**invites.service.ts:**
- `sendInvite(adminUserId: string, dto: SendInviteDto): Promise<InviteResponse>`
  - Validar permissões
  - Criar invite
  - Enviar email
- `acceptInvite(dto: AcceptInviteDto): Promise<AcceptInviteResponse>`
  - Validar token
  - Criar user e userClinicRole
  - Marcar invite como usado
  - Gerar tokens

### 3. Organizations Module

**Arquivos:**
```
src/organizations/
  ├── organizations.module.ts
  ├── organizations.controller.ts
  ├── organizations.service.ts
  └── dto/
      ├── create-clinic.dto.ts
      └── clinic-response.dto.ts
```

**organizations.service.ts:**
- `createClinic(organizationId: string, adminUserId: string, dto: CreateClinicDto): Promise<Clinic>`
  - Validar permissões
  - Criar clinic
  - Vincular criador como admin

### 4. Clinics Module

**Arquivos:**
```
src/clinics/
  ├── clinics.module.ts
  ├── clinics.controller.ts
  ├── clinics.service.ts
  └── dto/
      ├── add-member.dto.ts
      └── member-response.dto.ts
```

**clinics.service.ts:**
- `addMember(clinicId: string, adminUserId: string, dto: AddMemberDto): Promise<MemberResponse>`
  - Validar permissões
  - Criar userClinicRole

---

## DTOs e Validações

### SignupDto

```typescript
import { IsEmail, IsNotEmpty, IsString, Length, Matches, MinLength } from "class-validator";

export class SignupOrganizationDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 100)
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug deve conter apenas letras minúsculas, números e hífens",
  })
  slug: string;
}

export class SignupClinicDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;
}

export class SignupUserDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class SignupDto {
  @ValidateNested()
  @Type(() => SignupOrganizationDto)
  organization: SignupOrganizationDto;

  @ValidateNested()
  @Type(() => SignupClinicDto)
  clinic: SignupClinicDto;

  @ValidateNested()
  @Type(() => SignupUserDto)
  user: SignupUserDto;
}
```

### SendInviteDto

```typescript
export class SendInviteDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @IsNotEmpty()
  @IsUUID()
  clinicId: string;

  @IsNotEmpty()
  @IsEnum(["admin", "doctor", "secretary"])
  role: string;
}
```

### AcceptInviteDto

```typescript
export class AcceptInviteDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
```

### CreateClinicDto

```typescript
export class CreateClinicDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;
}
```

### AddMemberDto

```typescript
export class AddMemberDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsEnum(["admin", "doctor", "secretary"])
  role: string;
}
```

---

## Guards e Autorização

### 1. IsOrgAdminGuard

Valida se o usuário autenticado é admin da organização especificada.

```typescript
@Injectable()
export class IsOrgAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const organizationId = request.params.organizationId;

    // Buscar se user tem role admin em alguma clinic da org
    const adminAccess = await db
      .select()
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(
        and(
          eq(userClinicRoles.userId, user.userId),
          eq(clinics.organizationId, organizationId),
          eq(userClinicRoles.role, "admin")
        )
      )
      .limit(1);

    return adminAccess.length > 0;
  }
}
```

### 2. IsClinicAdminGuard

Valida se o usuário autenticado é admin da clínica especificada ou da organização que possui a clínica.

```typescript
@Injectable()
export class IsClinicAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const clinicId = request.params.clinicId;

    // Buscar clinic
    const clinic = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    if (clinic.length === 0) return false;

    // Verificar se é admin da clinic ou admin da org
    const adminAccess = await db
      .select()
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(
        and(
          eq(userClinicRoles.userId, user.userId),
          or(
            // Admin da clinic específica
            and(
              eq(userClinicRoles.clinicId, clinicId),
              eq(userClinicRoles.role, "admin")
            ),
            // Admin de qualquer clinic da mesma org
            and(
              eq(clinics.organizationId, clinic[0].organizationId),
              eq(userClinicRoles.role, "admin")
            )
          )
        )
      )
      .limit(1);

    return adminAccess.length > 0;
  }
}
```

---

## Email Templates

### 1. Email de Convite

**Assunto:** Você foi convidado para {OrganizationName}

**Corpo:**
```
Olá {Name},

Você foi convidado por {InviterName} para fazer parte de {OrganizationName} como {Role}.

Clique no link abaixo para aceitar o convite e criar sua conta:

{FRONTEND_URL}/accept-invite?token={token}

Este convite expira em 7 dias.

Se você não esperava este convite, pode ignorar este email.

---
Healz - Sistema de Gestão de Clínicas
```

---

## Migration

```typescript
// migrations/0007_add_invites_table.ts

export async function up(db: NodePgDatabase) {
  await db.execute(`
    CREATE TABLE invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      clinic_id UUID NOT NULL REFERENCES clinics(id),
      organization_id UUID NOT NULL REFERENCES organizations(id),
      role user_role NOT NULL,
      invited_by UUID NOT NULL REFERENCES users(id),
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX idx_invites_token ON invites(token);
    CREATE INDEX idx_invites_email ON invites(email);
    CREATE INDEX idx_invites_clinic_id ON invites(clinic_id);
    CREATE INDEX idx_invites_organization_id ON invites(organization_id);
  `);
}

export async function down(db: NodePgDatabase) {
  await db.execute(`DROP TABLE invites;`);
}
```

---

## Ordem de Implementação

### Fase 1: Setup e Schema
1. ✅ Criar migration para tabela `invites`
2. ✅ Rodar migration
3. ✅ Adicionar schema no Drizzle (`invites` em `auth.schema.ts`)

### Fase 2: Signup Module
4. ✅ Criar módulo signup
5. ✅ Implementar DTOs (SignupDto, SignupResponse)
6. ✅ Implementar signup.service.ts
7. ✅ Implementar signup.controller.ts
8. ✅ Adicionar rate limiting
9. ✅ Testar signup

### Fase 3: Invites Module
10. ✅ Criar módulo invites
11. ✅ Implementar DTOs (SendInviteDto, AcceptInviteDto)
12. ✅ Implementar guards (IsOrgAdminGuard)
13. ✅ Implementar invites.service.ts
14. ✅ Implementar invites.controller.ts
15. ✅ Criar template de email de convite
16. ✅ Adicionar rate limiting
17. ✅ Testar fluxo de convite completo

### Fase 4: Organizations Module
18. ✅ Criar módulo organizations
19. ✅ Implementar DTOs (CreateClinicDto)
20. ✅ Implementar organizations.service.ts
21. ✅ Implementar organizations.controller.ts
22. ✅ Adicionar rate limiting
23. ✅ Testar criação de clínicas

### Fase 5: Clinics Module
24. ✅ Criar módulo clinics
25. ✅ Implementar DTOs (AddMemberDto)
26. ✅ Implementar guards (IsClinicAdminGuard)
27. ✅ Implementar clinics.service.ts
28. ✅ Implementar clinics.controller.ts
29. ✅ Adicionar rate limiting
30. ✅ Testar adição de membros

### Fase 6: Testes e Documentação
31. ✅ Testes unitários para todos os services
32. ✅ Testes e2e para todos os endpoints
33. ✅ Atualizar AUTHENTICATION.md com novos fluxos
34. ✅ Documentar exemplos de uso

---

## Considerações de Segurança

1. **Signup B2B:**
   - Rate limit agressivo (3 req/min) para prevenir spam
   - Validar formato de email
   - Validar senha forte
   - Slug deve ser único e sanitizado

2. **Convites:**
   - Token aleatório criptograficamente seguro (32 bytes)
   - Expiração de 7 dias
   - Uso único (não pode ser reutilizado)
   - Validar que admin pertence à organização

3. **Criação de Clínicas:**
   - Apenas admins da organização
   - Validar que org existe

4. **Adição de Membros:**
   - Apenas admins da org ou clínica
   - Usuário não pode estar duplicado na mesma clínica

5. **Auditoria:**
   - Logar todas as ações de signup, convite, criação de clinic
   - Incluir IP e user agent

---

## Pontos de Atenção

1. **Transações DB:**
   - Signup B2B deve ser uma transação atômica (rollback se qualquer etapa falhar)
   - Accept invite também deve ser transação

2. **Emails:**
   - Enviar emails de forma assíncrona (fire-and-forget)
   - Tratar erros de envio sem bloquear o fluxo

3. **Auto-login:**
   - Após signup ou accept invite, retornar tokens para auto-login
   - Melhor UX (usuário não precisa fazer login manualmente)

4. **Convites Expirados:**
   - Limpar convites expirados periodicamente (cron job?)
   - Ou deixar acumular e validar na aceitação

5. **Email já cadastrado:**
   - No signup: retornar erro claro
   - No envio de convite: retornar erro claro
   - No accept invite: não deveria acontecer (validar no envio)

---

## Testes Manuais

### 1. Signup B2B

```bash
curl -X POST http://localhost:3001/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "organization": {
      "name": "Clínica Exemplo",
      "slug": "clinica-exemplo"
    },
    "clinic": {
      "name": "Unidade Principal"
    },
    "user": {
      "name": "Dr. João Silva",
      "email": "joao@clinica-exemplo.com",
      "password": "senha12345"
    }
  }'
```

### 2. Enviar Convite

```bash
curl -X POST http://localhost:3001/api/invites \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "medico@example.com",
    "name": "Dr. Maria Santos",
    "clinicId": "clinic-uuid",
    "role": "doctor"
  }'
```

### 3. Aceitar Convite

```bash
curl -X POST http://localhost:3001/api/invites/accept \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token-from-email",
    "password": "senha12345"
  }'
```

### 4. Criar Nova Clínica

```bash
curl -X POST http://localhost:3001/api/organizations/$ORG_ID/clinics \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unidade Centro"
  }'
```

### 5. Adicionar Membro a Clínica

```bash
curl -X POST http://localhost:3001/api/clinics/$CLINIC_ID/members \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "role": "secretary"
  }'
```

---

## Próximos Passos Após Implementação

1. **Gerenciamento de Usuários:**
   - GET /api/organizations/:id/users (listar usuários)
   - DELETE /api/clinics/:clinicId/members/:userId (remover usuário)
   - PATCH /api/clinics/:clinicId/members/:userId (alterar role)

2. **Gerenciamento de Organizações:**
   - GET /api/organizations/:id (detalhes da org)
   - PATCH /api/organizations/:id (atualizar org)
   - GET /api/organizations/:id/clinics (listar clínicas)

3. **Gerenciamento de Convites:**
   - GET /api/invites (listar convites pendentes)
   - DELETE /api/invites/:id (cancelar convite)
   - POST /api/invites/:id/resend (reenviar convite)

4. **Perfil de Usuário:**
   - GET /api/users/me (perfil do usuário)
   - PATCH /api/users/me (atualizar perfil)
   - PATCH /api/users/me/password (trocar senha)

---

## Conclusão

Este plano cobre os fluxos essenciais de signup e gerenciamento de usuários para sua aplicação multi-tenant. A implementação está dividida em fases para facilitar o desenvolvimento e testes incrementais.

**Estimativa de tempo:**
- Fase 1 (Schema): 30 minutos
- Fase 2 (Signup): 2-3 horas
- Fase 3 (Invites): 3-4 horas
- Fase 4 (Organizations): 1-2 horas
- Fase 5 (Clinics): 1-2 horas
- Fase 6 (Testes): 2-3 horas
- **Total: ~12-16 horas**

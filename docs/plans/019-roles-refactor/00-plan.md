# Plano: Refatoração de Roles e Multi-Tenant

> Data: 2026-02-19
> Status: Pendente

---

## Contexto

O sistema tem 3 problemas identificados que precisam ser corrigidos antes de continuar o desenvolvimento de features de produto:

1. **Enum errado** — `secretary` deveria ser `receptionist`, e faltam `manager` e `viewer`
2. **isPlatformAdmin ausente no JWT** — o guard faz query ao banco em toda requisição
3. **IsClinicAdminGuard com lógica errada** — `admin` em qualquer clínica da org não é o mesmo que `manager` de uma clínica específica

---

## Semântica dos Roles (nova)

| Role | Escopo | Atribuído quando |
|------|--------|-----------------|
| `admin` | Organização inteira | Signup + plataforma cria org com admin inicial |
| `manager` | Clínica específica | Plataforma cria clínica com admin inicial |
| `doctor` | Clínica (operacional) | Convite |
| `receptionist` | Clínica (operacional) | Convite |
| `viewer` | Clínica (read-only) | Convite |

**Regra chave:** `admin` = dono/gestor da organização (acesso a todas as clínicas). `manager` = gestor de uma clínica específica.

---

## Problema 1 — Migração do Enum

### O que muda

**Enum atual:** `admin`, `doctor`, `secretary`
**Enum alvo:** `admin`, `manager`, `doctor`, `receptionist`, `viewer`

Não é possível remover valores de um enum PostgreSQL — é necessário recriar o tipo.

### Passo 1 — Atualizar schema TypeScript

**Arquivo:** `apps/api/src/db/schema/auth.schema.ts`

```typescript
// ANTES
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "doctor",
  "secretary",
]);

// DEPOIS
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "doctor",
  "receptionist",
  "viewer",
]);
```

### Passo 2 — Gerar migração base com drizzle-kit

```bash
cd apps/api
npx drizzle-kit generate --name roles_refactor
```

Isso gera o arquivo `0012_roles_refactor.sql` e o snapshot correspondente no `meta/`.

### Passo 3 — Substituir o SQL gerado

Drizzle-kit **não sabe recriar** um enum corretamente (não remove `secretary`). Após gerar, **substituir todo o conteúdo** do arquivo `0012_roles_refactor.sql` com o SQL abaixo:

```sql
-- Recriar o tipo user_role com os valores corretos
-- Migrar 'secretary' → 'receptionist' nos dados existentes

-- Passo A: Criar novo tipo com os valores desejados
CREATE TYPE "public"."user_role_new" AS ENUM('admin', 'manager', 'doctor', 'receptionist', 'viewer');
--> statement-breakpoint

-- Passo B: Migrar coluna user_clinic_roles
ALTER TABLE "user_clinic_roles"
  ALTER COLUMN "role" TYPE "public"."user_role_new"
  USING (
    CASE
      WHEN "role"::text = 'secretary' THEN 'receptionist'::"public"."user_role_new"
      ELSE "role"::text::"public"."user_role_new"
    END
  );
--> statement-breakpoint

-- Passo C: Migrar coluna invites
ALTER TABLE "invites"
  ALTER COLUMN "role" TYPE "public"."user_role_new"
  USING (
    CASE
      WHEN "role"::text = 'secretary' THEN 'receptionist'::"public"."user_role_new"
      ELSE "role"::text::"public"."user_role_new"
    END
  );
--> statement-breakpoint

-- Passo D: Remover tipo antigo e renomear
DROP TYPE "public"."user_role";
--> statement-breakpoint
ALTER TYPE "public"."user_role_new" RENAME TO "user_role";
```

### Passo 4 — Aplicar a migração

```bash
cd apps/api
npx drizzle-kit migrate
```

> ⚠️ **Nunca usar `drizzle-kit push`.**

### Passo 5 — Atualizar tipos TypeScript hardcoded

Buscar e atualizar todos os arquivos que usam a union type `"admin" | "doctor" | "secretary"`:

**`apps/api/src/auth/interfaces/jwt-payload.interface.ts`** (linha 12):
```typescript
// ANTES
role: "admin" | "doctor" | "secretary";

// DEPOIS
role: "admin" | "manager" | "doctor" | "receptionist" | "viewer";
```

**`apps/api/src/platform-admin/dto/users/create-user.dto.ts`** (linha 47):
```typescript
// ANTES
role?: "admin" | "doctor" | "secretary";

// DEPOIS
role?: "admin" | "manager" | "doctor" | "receptionist" | "viewer";
```

**`apps/api/src/platform-admin/dto/users/add-user-clinic.dto.ts`** (linha 18):
```typescript
// ANTES
role: "admin" | "doctor" | "secretary";

// DEPOIS
role: "admin" | "manager" | "doctor" | "receptionist" | "viewer";
```

**`apps/api/src/platform-admin/dto/users/update-user-clinic.dto.ts`** (linha 11):
```typescript
// ANTES
role: "admin" | "doctor" | "secretary";

// DEPOIS
role: "admin" | "manager" | "doctor" | "receptionist" | "viewer";
```

**`apps/api/src/platform-admin/services/platform-admin-users.service.ts`** (linhas 79 e 109):
```typescript
// ANTES
eq(userClinicRoles.role, role as "admin" | "doctor" | "secretary")

// DEPOIS
eq(userClinicRoles.role, role as "admin" | "manager" | "doctor" | "receptionist" | "viewer")
```

**`apps/api/src/auth/auth.controller.ts`** (linha 71 — OpenAPI example):
```typescript
// ANTES
role: { type: "string", enum: ["admin", "doctor", "secretary"] }

// DEPOIS
role: { type: "string", enum: ["admin", "manager", "doctor", "receptionist", "viewer"] }
```

---

## Problema 2 — isPlatformAdmin no JWT

### O que muda

1. Adicionar `isPlatformAdmin?: boolean` à interface `JwtPayload`
2. Incluir `isPlatformAdmin` no payload gerado em `login()` e `refreshAccessToken()`
3. `PlatformAdminGuard` passa a ler do JWT (sem query ao banco)

### Arquivo: `apps/api/src/auth/interfaces/jwt-payload.interface.ts`

```typescript
export interface JwtPayload {
  userId: string;
  email: string;
  organizationId?: string;
  activeClinicId?: string;
  clinicAccess: ClinicAccess[];
  isPlatformAdmin?: boolean; // NOVO
  isImpersonating?: boolean;
  impersonatedBy?: string;
}

export interface ClinicAccess {
  clinicId: string;
  clinicName: string;
  role: "admin" | "manager" | "doctor" | "receptionist" | "viewer"; // atualizado
}
```

### Arquivo: `apps/api/src/auth/auth.service.ts`

**No método `login()`** — o `isPlatformAdmin` já é calculado (linha 89). Incluir no payload:

```typescript
const payload: JwtPayload = {
  userId: user[0].id,
  email: user[0].email,
  organizationId: activeClinic?.organizationId,
  activeClinicId: activeClinic?.clinicId,
  clinicAccess: activeUserClinics.map((c) => ({
    clinicId: c.clinicId,
    clinicName: c.clinicName,
    role: c.role,
  })),
  isPlatformAdmin: isPlatformAdmin, // NOVO — variável já existe no método
};
```

**No método `refreshAccessToken()`** — já há um bloco que calcula `isPlatformAdmin` (linhas 317–329). Incluir no payload:

```typescript
const payload: JwtPayload = {
  userId: user[0].id,
  email: user[0].email,
  organizationId: userClinics.length > 0 ? userClinics[0].organizationId : undefined,
  activeClinicId: userClinics.length > 0 ? userClinics[0].clinicId : undefined,
  clinicAccess: userClinics.map((c) => ({
    clinicId: c.clinicId,
    clinicName: c.clinicName,
    role: c.role,
  })),
  isPlatformAdmin: isPlatformAdmin, // NOVO — variável já existe no método
};
```

### Arquivo: `apps/api/src/platform-admin/guards/platform-admin.guard.ts`

Substituir a implementação inteira. O guard passa a ser síncrono (sem DB query):

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { JwtPayload } from "../../auth/interfaces/jwt-payload.interface";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user?.userId || !user?.isPlatformAdmin) {
      throw new ForbiddenException(
        "Acesso exclusivo para administradores da plataforma",
      );
    }

    return true;
  }
}
```

---

## Problema 3 — IsClinicAdminGuard + Role de criação de clínica

### O que muda

**Guard:** A lógica de "admin em qualquer clínica da org = acesso" é mantida, mas separada corretamente por role:
- `admin` (role) = acesso a toda a organização → checar em qualquer clínica da org
- `manager` (role) = acesso à clínica específica → checar somente na clínica alvo

**Criação de clínica via plataforma:** `initialAdmin` deve receber `manager`, não `admin`.

### Arquivo: `apps/api/src/clinics/guards/is-clinic-admin.guard.ts`

Substituir a cláusula `or(...)` dentro do `where`:

```typescript
// ANTES: checava 'admin' em dois lugares (clínica específica OU qualquer clínica da org)
or(
  and(
    eq(userClinicRoles.clinicId, clinicId),
    eq(userClinicRoles.role, "admin"),
  ),
  and(
    eq(clinics.organizationId, clinic[0].organizationId),
    eq(userClinicRoles.role, "admin"),
  ),
),

// DEPOIS: 'admin' é org-wide; 'manager' é clinic-specific
or(
  // Org admin: tem role 'admin' em qualquer clínica da organização
  and(
    eq(clinics.organizationId, clinic[0].organizationId),
    eq(userClinicRoles.role, "admin"),
  ),
  // Clinic manager: tem role 'manager' especificamente nesta clínica
  and(
    eq(userClinicRoles.clinicId, clinicId),
    eq(userClinicRoles.role, "manager"),
  ),
),
```

A mensagem de erro também deve ser atualizada:
```typescript
throw new ForbiddenException(
  "Apenas administradores da organização ou gerentes desta clínica podem realizar esta ação",
);
```

### Arquivo: `apps/api/src/platform-admin/services/platform-admin-clinics.service.ts`

Alterar o role do `initialAdmin` ao criar clínica (linha 208):

```typescript
// ANTES
await tx.insert(userClinicRoles).values({
  userId: dto.initialAdminId,
  clinicId: clinic.id,
  role: "admin",   // ❌ errado — admin é org-wide
});

// DEPOIS
await tx.insert(userClinicRoles).values({
  userId: dto.initialAdminId,
  clinicId: clinic.id,
  role: "manager", // ✅ correto — manager é clinic-specific
});
```

### O que NÃO muda

Os seguintes locais devem continuar atribuindo `admin` — pois se referem ao admin da organização:

| Arquivo | Linha | Contexto |
|---------|-------|---------|
| `signup.service.ts` | 104 | Criador da org no signup → admin da org ✅ |
| `platform-admin-organizations.service.ts` | 268, 289 | Admin inicial ao criar org → admin da org ✅ |
| `organizations.service.ts` | 67 | Org admin cria clínica → continua como admin ✅ |
| `invites/guards/is-org-admin.guard.ts` | 33 | Checa role `admin` → comportamento correto ✅ |

---

## Ordem de Execução

1. **Problema 1 — Schema e migração** (primeiro — antes de qualquer deploy)
   - Atualizar `auth.schema.ts`
   - Gerar migração com drizzle-kit generate
   - Substituir SQL gerado pelo SQL de recreação do enum
   - Aplicar com drizzle-kit migrate
   - Atualizar todos os tipos TypeScript hardcoded

2. **Problema 2 — JWT e PlatformAdminGuard**
   - Atualizar `jwt-payload.interface.ts`
   - Atualizar `auth.service.ts` (login + refresh)
   - Substituir `platform-admin.guard.ts`

3. **Problema 3 — Guards e role de criação**
   - Atualizar `is-clinic-admin.guard.ts`
   - Atualizar `platform-admin-clinics.service.ts`

---

## Validação

Após implementar, verificar:

- [ ] `drizzle-kit migrate` executa sem erros
- [ ] Login de Platform Admin inclui `isPlatformAdmin: true` no JWT (decodificar token)
- [ ] Login de usuário comum inclui `isPlatformAdmin: false` ou ausente no JWT
- [ ] `PlatformAdminGuard` bloqueia usuários sem `isPlatformAdmin`
- [ ] Criar clínica via plataforma admin com `initialAdminId` → role gerado é `manager`
- [ ] Criar org via plataforma admin → role do admin inicial é `admin`
- [ ] Usuário com role `manager` de uma clínica passa no `IsClinicAdminGuard` para aquela clínica
- [ ] Usuário com role `admin` em qualquer clínica da org passa no `IsClinicAdminGuard` para qualquer clínica da org
- [ ] Usuário com role `doctor` falha no `IsClinicAdminGuard`

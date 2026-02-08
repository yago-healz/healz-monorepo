# Mapeamento Detalhado de Endpoints - API Healz

## 📋 Documentação Técnica Completa

Este documento contém o mapeamento técnico detalhado de todos os endpoints da API, incluindo:
- Método HTTP e rota
- Guards de autenticação/autorização
- Rate limiting
- DTOs de entrada/saída
- Status codes esperados
- Regras de negócio

---

## 1. Health Check

### GET /health

**Autenticação:** Não
**Rate Limit:** Desabilitado (SkipThrottle)
**Controller:** `HealthController`

**Resposta 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-08T10:00:00.000Z"
}
```

---

## 2. Authentication (`/auth`)

### POST /auth/login

**Autenticação:** Não
**Rate Limit:** 5 req/min
**DTO:** `LoginDto`

**Request Body:**
```json
{
  "email": "string (email format)",
  "password": "string",
  "clinicId": "string (uuid, optional)"
}
```

**Resposta 200:**
```json
{
  "accessToken": "string (JWT)",
  "user": {
    "id": "string (uuid)",
    "email": "string",
    "name": "string",
    "emailVerified": "boolean",
    "activeClinic": {
      "id": "string",
      "name": "string",
      "organizationId": "string",
      "role": "admin | doctor | secretary"
    },
    "availableClinics": [
      {
        "clinicId": "string",
        "clinicName": "string",
        "role": "string"
      }
    ]
  }
}
```

**Cookies:**
- `refreshToken` (httpOnly, secure em prod, sameSite: strict, maxAge: 7 dias)

**Status Codes:**
- `200` - Login realizado com sucesso
- `401` - Credenciais inválidas
- `429` - Rate limit excedido

---

### POST /auth/switch-context

**Autenticação:** Sim (JwtAuthGuard)
**Rate Limit:** Default
**DTO:** `SwitchContextDto`

**Request Body:**
```json
{
  "clinicId": "string (uuid)"
}
```

**Resposta 200:**
```json
{
  "accessToken": "string (JWT com novo contexto)"
}
```

**Status Codes:**
- `200` - Contexto trocado com sucesso
- `401` - Não autenticado ou usuário não tem acesso à clínica
- `404` - Clínica não encontrada

---

### POST /auth/refresh

**Autenticação:** Cookie (refreshToken)
**Rate Limit:** 20 req/min
**DTO:** N/A

**Request:** Cookie `refreshToken`

**Resposta 200:**
```json
{
  "accessToken": "string (JWT novo)"
}
```

**Cookies:**
- `refreshToken` (novo token rotacionado)

**Status Codes:**
- `200` - Token renovado com sucesso
- `401` - Token inválido, expirado ou reutilizado (refresh token rotation detection)
- `429` - Rate limit excedido

**Regras:**
- Implementa refresh token rotation
- Token antigo é invalidado após uso
- Detecta reutilização de token (possível roubo)

---

### POST /auth/logout

**Autenticação:** Sim (JwtAuthGuard)
**Rate Limit:** Default
**DTO:** N/A

**Resposta:** 204 (No Content)

**Status Codes:**
- `204` - Logout realizado com sucesso
- `401` - Não autenticado

**Regras:**
- Invalida todos os refresh tokens da família
- Limpa cookie de refresh token

---

### POST /auth/verify-email

**Autenticação:** Não
**Rate Limit:** Default
**DTO:** `VerifyEmailDto`

**Request Body:**
```json
{
  "token": "string"
}
```

**Resposta 200:**
```json
{
  "message": "Email verificado com sucesso"
}
```

**Status Codes:**
- `200` - Email verificado
- `400` - Token inválido ou expirado

---

### POST /auth/resend-verification

**Autenticação:** Sim (JwtAuthGuard)
**Rate Limit:** Default
**DTO:** N/A

**Resposta 200:**
```json
{
  "message": "Email de verificação reenviado"
}
```

**Status Codes:**
- `200` - Email reenviado
- `401` - Não autenticado

---

### POST /auth/forgot-password

**Autenticação:** Não
**Rate Limit:** 3 req/min
**DTO:** `ForgotPasswordDto`

**Request Body:**
```json
{
  "email": "string (email format)"
}
```

**Resposta 200:**
```json
{
  "message": "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha."
}
```

**Status Codes:**
- `200` - Sempre retorna sucesso (previne enumeração de emails)
- `429` - Rate limit excedido

**Regras:**
- Sempre retorna 200, mesmo se email não existir
- Previne enumeração de usuários

---

### POST /auth/reset-password

**Autenticação:** Não
**Rate Limit:** 5 req/min
**DTO:** `ResetPasswordDto`

**Request Body:**
```json
{
  "token": "string",
  "newPassword": "string (min 8 chars, strong password)"
}
```

**Resposta 200:**
```json
{
  "message": "Senha alterada com sucesso. Faça login com sua nova senha."
}
```

**Status Codes:**
- `200` - Senha alterada
- `400` - Token inválido ou expirado, ou senha fraca
- `429` - Rate limit excedido

**Regras:**
- Invalida todos os refresh tokens existentes por segurança

---

## 3. Signup (`/signup`)

### POST /signup

**Autenticação:** Não
**Rate Limit:** 3 req/min
**DTO:** `SignupDto`

**Request Body:**
```json
{
  "email": "string (email format)",
  "password": "string (min 8 chars)",
  "name": "string",
  "organizationName": "string",
  "organizationSlug": "string (slug format)",
  "clinicName": "string"
}
```

**Resposta 201:**
```json
{
  "accessToken": "string (JWT)",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "emailVerified": false,
    "activeClinic": {
      "id": "string",
      "name": "string",
      "organizationId": "string",
      "role": "admin"
    },
    "availableClinics": [...]
  },
  "organization": {
    "id": "string",
    "name": "string",
    "slug": "string"
  }
}
```

**Cookies:**
- `refreshToken`

**Status Codes:**
- `201` - Organização criada com sucesso
- `400` - Email já cadastrado, slug já em uso, ou validação falhou
- `429` - Rate limit excedido

**Regras:**
- Cria organização, clínica e usuário admin em uma transação
- Login automático após signup
- Envia email de verificação

---

## 4. Organizations (`/organizations`)

### POST /organizations/:organizationId/clinics

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** Requer admin da organização
**Rate Limit:** 10 req/min
**DTO:** `CreateClinicDto`

**Request Body:**
```json
{
  "name": "string",
  "address": "string (optional)",
  "city": "string (optional)",
  "state": "string (optional)",
  "phone": "string (optional)"
}
```

**Resposta 201:**
```json
{
  "id": "string (uuid)",
  "name": "string",
  "organizationId": "string",
  "createdAt": "string (ISO date)"
}
```

**Status Codes:**
- `201` - Clínica criada
- `400` - Organização não existe
- `401` - Não autenticado
- `403` - Sem permissão de admin na organização
- `429` - Rate limit excedido

**Regras:**
- Usuário criador é automaticamente adicionado como admin da clínica
- Registra no audit log

---

## 5. Clinics (`/clinics`)

### POST /clinics/:clinicId/members

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** IsClinicAdminGuard
**Rate Limit:** 10 req/min
**DTO:** `AddMemberDto`

**Request Body:**
```json
{
  "userId": "string (uuid)",
  "role": "admin | doctor | secretary"
}
```

**Resposta 201:**
```json
{
  "message": "Usuário adicionado à clínica com sucesso",
  "member": {
    "userId": "string",
    "clinicId": "string",
    "role": "string"
  }
}
```

**Status Codes:**
- `201` - Membro adicionado
- `400` - Usuário não existe, clínica não existe ou usuário já é membro
- `401` - Não autenticado
- `403` - Sem permissão de admin
- `429` - Rate limit excedido

**Regras:**
- Verifica se usuário já não é membro da clínica
- Registra no audit log

---

## 6. Invites (`/invites`)

### POST /invites

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** IsOrgAdminGuard
**Rate Limit:** 10 req/min
**DTO:** `SendInviteDto`

**Request Body:**
```json
{
  "email": "string (email format)",
  "clinicId": "string (uuid)",
  "role": "admin | doctor | secretary",
  "name": "string (optional)"
}
```

**Resposta 201:**
```json
{
  "message": "Convite enviado com sucesso",
  "invite": {
    "id": "string",
    "email": "string",
    "clinicId": "string",
    "role": "string",
    "expiresAt": "string (ISO date, +7 days)"
  }
}
```

**Status Codes:**
- `201` - Convite enviado
- `400` - Email já cadastrado ou clínica inválida
- `401` - Não autenticado
- `403` - Sem permissão de admin
- `429` - Rate limit excedido

**Regras:**
- Token válido por 7 dias
- Não pode convidar email já cadastrado
- Envia email com link de aceitação

---

### POST /invites/accept

**Autenticação:** Não
**Rate Limit:** 5 req/min
**DTO:** `AcceptInviteDto`

**Request Body:**
```json
{
  "token": "string",
  "password": "string (min 8 chars)",
  "name": "string"
}
```

**Resposta 200:**
```json
{
  "accessToken": "string (JWT)",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "emailVerified": false,
    "activeClinic": {
      "id": "string",
      "name": "string",
      "organizationId": "string",
      "role": "string (role do convite)"
    },
    "availableClinics": [...]
  }
}
```

**Cookies:**
- `refreshToken`

**Status Codes:**
- `200` - Convite aceito e conta criada
- `400` - Token inválido, expirado ou já utilizado
- `429` - Rate limit excedido

**Regras:**
- Cria conta de usuário
- Login automático após aceitar convite
- Marca convite como usado

---

## 7. Platform Admin - Organizations

### GET /platform-admin/organizations

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 100 req/min
**DTO:** `ListOrganizationsQueryDto`

**Query Params:**
```
page: number (default: 1)
limit: number (default: 10, max: 100)
search: string (optional, busca por name ou slug)
status: "active" | "inactive" (optional)
sortBy: "name" | "createdAt" (default: "createdAt")
sortOrder: "asc" | "desc" (default: "desc")
```

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "slug": "string",
      "status": "active | inactive",
      "createdAt": "string",
      "updatedAt": "string",
      "_count": {
        "clinics": "number",
        "users": "number"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

**Status Codes:**
- `200` - Lista retornada
- `401` - Não autenticado
- `403` - Não é platform admin

---

### GET /platform-admin/organizations/:id

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** Default

**Resposta 200:**
```json
{
  "id": "string",
  "name": "string",
  "slug": "string",
  "status": "active | inactive",
  "createdAt": "string",
  "updatedAt": "string",
  "clinics": [
    {
      "id": "string",
      "name": "string",
      "status": "string",
      "_count": { "members": "number" }
    }
  ],
  "admins": [
    {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  ],
  "_count": {
    "clinics": "number",
    "users": "number"
  }
}
```

**Status Codes:**
- `200` - Detalhes retornados
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Organização não encontrada

---

### POST /platform-admin/organizations

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 30 req/min
**DTO:** `CreateOrganizationDto`

**Request Body:**
```json
{
  "name": "string",
  "slug": "string (unique)",
  "clinicName": "string",
  "adminEmail": "string (email format)",
  "adminName": "string",
  "adminPassword": "string (min 8 chars)"
}
```

**Resposta 201:**
```json
{
  "organization": { "id": "string", "name": "string", "slug": "string" },
  "clinic": { "id": "string", "name": "string" },
  "admin": { "id": "string", "email": "string", "name": "string" },
  "invite": { "id": "string", "email": "string" }
}
```

**Status Codes:**
- `201` - Organização criada
- `400` - Slug já existe ou dados inválidos
- `401` - Não autenticado
- `403` - Não é platform admin

**Regras:**
- Cria organização + clínica + admin em uma transação
- Envia convite para o admin
- Registra no audit log

---

### PATCH /platform-admin/organizations/:id

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 30 req/min
**DTO:** `UpdateOrganizationDto`

**Request Body:**
```json
{
  "name": "string (optional)",
  "slug": "string (optional)"
}
```

**Resposta 200:**
```json
{
  "message": "Organização atualizada com sucesso"
}
```

**Status Codes:**
- `200` - Atualizado
- `400` - Slug já existe
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Organização não encontrada

---

### PATCH /platform-admin/organizations/:id/status

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 30 req/min
**DTO:** `UpdateOrgStatusDto`

**Request Body:**
```json
{
  "status": "active | inactive"
}
```

**Resposta 200:**
```json
{
  "message": "Status da organização atualizado com sucesso"
}
```

**Status Codes:**
- `200` - Status atualizado
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Organização não encontrada

**Regras:**
- Ao desativar organização, desativa todas as clínicas em cascata
- Registra no audit log

---

## 8. Platform Admin - Clinics

### GET /platform-admin/clinics

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 100 req/min
**DTO:** `ListClinicsQueryDto`

**Query Params:**
```
page: number (default: 1)
limit: number (default: 10, max: 100)
search: string (optional)
organizationId: string (uuid, optional)
status: "active" | "inactive" (optional)
sortBy: "name" | "createdAt" (default: "createdAt")
sortOrder: "asc" | "desc" (default: "desc")
```

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "organizationId": "string",
      "status": "active | inactive",
      "createdAt": "string",
      "organization": {
        "id": "string",
        "name": "string",
        "slug": "string"
      },
      "_count": {
        "members": "number"
      }
    }
  ],
  "pagination": { ... }
}
```

**Status Codes:**
- `200` - Lista retornada
- `401` - Não autenticado
- `403` - Não é platform admin

---

### GET /platform-admin/clinics/:id

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** Default

**Resposta 200:**
```json
{
  "id": "string",
  "name": "string",
  "organizationId": "string",
  "status": "active | inactive",
  "createdAt": "string",
  "organization": {
    "id": "string",
    "name": "string",
    "slug": "string"
  },
  "members": [
    {
      "userId": "string",
      "role": "string",
      "user": {
        "id": "string",
        "name": "string",
        "email": "string"
      }
    }
  ]
}
```

**Status Codes:**
- `200` - Detalhes retornados
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Clínica não encontrada

---

### POST /platform-admin/clinics

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 30 req/min
**DTO:** `CreateClinicDto`

**Request Body:**
```json
{
  "name": "string",
  "organizationId": "string (uuid)"
}
```

**Resposta 201:**
```json
{
  "id": "string",
  "name": "string",
  "organizationId": "string",
  "status": "active",
  "createdAt": "string"
}
```

**Status Codes:**
- `201` - Clínica criada
- `400` - Organização não existe
- `401` - Não autenticado
- `403` - Não é platform admin

---

### PATCH /platform-admin/clinics/:id

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 30 req/min
**DTO:** `UpdateClinicDto`

**Request Body:**
```json
{
  "name": "string"
}
```

**Resposta 200:**
```json
{
  "message": "Clínica atualizada com sucesso"
}
```

**Status Codes:**
- `200` - Atualizado
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Clínica não encontrada

---

### PATCH /platform-admin/clinics/:id/transfer

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 30 req/min
**DTO:** `TransferClinicDto`

**Request Body:**
```json
{
  "newOrganizationId": "string (uuid)"
}
```

**Resposta 200:**
```json
{
  "message": "Clínica transferida com sucesso",
  "clinic": {
    "id": "string",
    "name": "string",
    "organizationId": "string (novo)"
  }
}
```

**Status Codes:**
- `200` - Transferido
- `400` - Organização destino não existe
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Clínica não encontrada

**Regras:**
- Move clínica para outra organização
- Mantém todos os membros
- Registra no audit log

---

### PATCH /platform-admin/clinics/:id/status

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 30 req/min
**DTO:** `UpdateClinicStatusDto`

**Request Body:**
```json
{
  "status": "active | inactive"
}
```

**Resposta 200:**
```json
{
  "message": "Status da clínica atualizado com sucesso"
}
```

**Status Codes:**
- `200` - Status atualizado
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Clínica não encontrada

---

## 9. Platform Admin - Users

### GET /platform-admin/users

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 100 req/min
**DTO:** `ListUsersQueryDto`

**Query Params:**
```
page: number (default: 1)
limit: number (default: 10, max: 100)
search: string (optional, busca por name ou email)
clinicId: string (uuid, optional)
organizationId: string (uuid, optional)
status: "active" | "inactive" (optional)
emailVerified: boolean (optional)
sortBy: "name" | "email" | "createdAt" (default: "createdAt")
sortOrder: "asc" | "desc" (default: "desc")
```

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "string",
      "email": "string",
      "name": "string",
      "emailVerified": "boolean",
      "status": "active | inactive",
      "createdAt": "string",
      "clinics": [
        {
          "clinicId": "string",
          "clinicName": "string",
          "role": "string",
          "organizationName": "string"
        }
      ]
    }
  ],
  "pagination": { ... }
}
```

**Status Codes:**
- `200` - Lista retornada
- `401` - Não autenticado
- `403` - Não é platform admin

---

### GET /platform-admin/users/:id

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** Default

**Resposta 200:**
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "emailVerified": "boolean",
  "status": "active | inactive",
  "createdAt": "string",
  "updatedAt": "string",
  "clinics": [
    {
      "clinicId": "string",
      "role": "string",
      "clinic": {
        "id": "string",
        "name": "string",
        "organizationId": "string",
        "organization": {
          "name": "string",
          "slug": "string"
        }
      }
    }
  ],
  "isPlatformAdmin": "boolean"
}
```

**Status Codes:**
- `200` - Detalhes retornados
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Usuário não encontrado

---

### POST /platform-admin/users

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 30 req/min
**DTO:** `CreateUserDto`

**Request Body:**
```json
{
  "email": "string (email format)",
  "name": "string",
  "password": "string (min 8 chars)",
  "clinicId": "string (uuid)",
  "role": "admin | doctor | secretary"
}
```

**Resposta 201:**
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "emailVerified": false,
  "status": "active",
  "createdAt": "string"
}
```

**Status Codes:**
- `201` - Usuário criado
- `400` - Email já existe ou clínica não existe
- `401` - Não autenticado
- `403` - Não é platform admin

**Regras:**
- Cria usuário já vinculado a uma clínica
- Envia email de verificação

---

### PATCH /platform-admin/users/:id

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** Default
**DTO:** `UpdateUserDto`

**Request Body:**
```json
{
  "name": "string (optional)",
  "email": "string (optional, email format)"
}
```

**Resposta 200:**
```json
{
  "message": "Usuário atualizado com sucesso"
}
```

**Status Codes:**
- `200` - Atualizado
- `400` - Email já em uso
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Usuário não encontrado

**Regras:**
- Se alterar email, marca emailVerified como false

---

### POST /platform-admin/users/:id/reset-password

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 30 req/min
**DTO:** `ResetPasswordDto`

**Request Body:**
```json
{
  "newPassword": "string (min 8 chars)"
}
```

**Resposta 200:**
```json
{
  "message": "Senha resetada com sucesso"
}
```

**Status Codes:**
- `200` - Senha resetada
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Usuário não encontrado

**Regras:**
- Invalida todos os refresh tokens do usuário
- Usuário precisa fazer login novamente

---

### POST /platform-admin/users/:id/verify-email

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** Default

**Resposta 200:**
```json
{
  "message": "Email verificado com sucesso"
}
```

**Status Codes:**
- `200` - Email verificado
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Usuário não encontrado

**Regras:**
- Força verificação de email sem token

---

### PATCH /platform-admin/users/:id/status

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** Default
**DTO:** `UpdateUserStatusDto`

**Request Body:**
```json
{
  "status": "active | inactive"
}
```

**Resposta 200:**
```json
{
  "message": "Status do usuário atualizado com sucesso"
}
```

**Status Codes:**
- `200` - Status atualizado
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Usuário não encontrado

**Regras:**
- Ao desativar, invalida todos os refresh tokens

---

### POST /platform-admin/users/:userId/clinics

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** Default
**DTO:** `AddUserClinicDto`

**Request Body:**
```json
{
  "clinicId": "string (uuid)",
  "role": "admin | doctor | secretary"
}
```

**Resposta 201:**
```json
{
  "message": "Usuário adicionado à clínica com sucesso"
}
```

**Status Codes:**
- `201` - Adicionado
- `400` - Usuário já é membro da clínica ou clínica não existe
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Usuário não encontrado

---

### PATCH /platform-admin/users/:userId/clinics/:clinicId

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** Default
**DTO:** `UpdateUserClinicDto`

**Request Body:**
```json
{
  "role": "admin | doctor | secretary"
}
```

**Resposta 200:**
```json
{
  "message": "Role do usuário atualizado com sucesso"
}
```

**Status Codes:**
- `200` - Atualizado
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Relação não encontrada

---

### DELETE /platform-admin/users/:userId/clinics/:clinicId

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** Default

**Resposta 200:**
```json
{
  "message": "Usuário removido da clínica com sucesso"
}
```

**Status Codes:**
- `200` - Removido
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Relação não encontrada

**Regras:**
- Não pode remover o último admin da clínica

---

## 10. Platform Admin - Support

### POST /platform-admin/users/:id/impersonate

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 5 req/min

**Resposta 200:**
```json
{
  "accessToken": "string (JWT temporário, expira em 5 min)",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string"
  }
}
```

**Status Codes:**
- `200` - Token de impersonation gerado
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Usuário não encontrado
- `429` - Rate limit excedido

**Regras:**
- Token expira em 5 minutos
- Registra no audit log
- Permite suporte técnico testar conta do usuário

---

### POST /platform-admin/users/:id/revoke-sessions

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** Default

**Resposta 200:**
```json
{
  "message": "Todas as sessões do usuário foram revogadas"
}
```

**Status Codes:**
- `200` - Sessões revogadas
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Usuário não encontrado

**Regras:**
- Invalida todos os refresh tokens do usuário
- Força logout em todos os dispositivos

---

## 11. Platform Admin - Admins

### GET /platform-admin/admins

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 100 req/min

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "string",
      "userId": "string",
      "createdAt": "string",
      "user": {
        "id": "string",
        "email": "string",
        "name": "string",
        "status": "string"
      }
    }
  ]
}
```

**Status Codes:**
- `200` - Lista retornada
- `401` - Não autenticado
- `403` - Não é platform admin

---

### POST /platform-admin/admins

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** 10 req/min
**DTO:** `CreatePlatformAdminDto`

**Request Body:**
```json
{
  "userId": "string (uuid)"
}
```

**Resposta 201:**
```json
{
  "message": "Platform admin criado com sucesso",
  "admin": {
    "id": "string",
    "userId": "string",
    "createdAt": "string"
  }
}
```

**Status Codes:**
- `201` - Admin criado
- `400` - Usuário não existe ou já é platform admin
- `401` - Não autenticado
- `403` - Não é platform admin
- `429` - Rate limit excedido

**Regras:**
- Promove usuário existente a platform admin

---

### DELETE /platform-admin/admins/:id

**Autenticação:** Sim (JwtAuthGuard)
**Autorização:** PlatformAdminGuard
**Rate Limit:** Default

**Resposta 200:**
```json
{
  "message": "Permissões de platform admin revogadas"
}
```

**Status Codes:**
- `200` - Revogado
- `401` - Não autenticado
- `403` - Não é platform admin
- `404` - Platform admin não encontrado

**Regras:**
- Remove permissões de platform admin
- Usuário continua existindo, apenas perde privilégios

---

## 📊 Resumo por Módulo

| Módulo | Endpoints | Autenticados | Públicos |
|--------|-----------|--------------|----------|
| Health | 1 | 0 | 1 |
| Auth | 8 | 3 | 5 |
| Signup | 1 | 0 | 1 |
| Organizations | 1 | 1 | 0 |
| Clinics | 1 | 1 | 0 |
| Invites | 2 | 1 | 1 |
| Platform Admin - Organizations | 5 | 5 | 0 |
| Platform Admin - Clinics | 6 | 6 | 0 |
| Platform Admin - Users | 10 | 10 | 0 |
| Platform Admin - Support | 2 | 2 | 0 |
| Platform Admin - Admins | 3 | 3 | 0 |
| **TOTAL** | **43** | **35** | **8** |

---

## 🔐 Guards e Middlewares

### Guards Utilizados

1. **JwtAuthGuard** - Valida JWT access token
2. **PlatformAdminGuard** - Verifica se usuário é platform admin
3. **IsOrgAdminGuard** - Verifica se usuário é admin da organização
4. **IsClinicAdminGuard** - Verifica se usuário é admin da clínica

### Middlewares

1. **RlsMiddleware** - Define contexto de organização para RLS (Row Level Security)
   - Aplicado em todas as rotas exceto: `/auth/*`, `/signup`, `/invites/accept`

### Rate Limiting

| Limite | Endpoints |
|--------|-----------|
| 3 req/min | signup, forgot-password |
| 5 req/min | login, reset-password, accept-invite, impersonate |
| 10 req/min | create-clinic, add-member, send-invite, create-admin |
| 20 req/min | refresh |
| 30 req/min | Platform Admin CUD operations |
| 100 req/min | Platform Admin list operations |
| Default | Demais endpoints |
| Desabilitado | health |

---

**Documento criado em:** 2026-02-08
**Última atualização:** 2026-02-08
**Versão:** 1.0

# Autenticação e Multi-Tenant - Healz API

## Visão Geral

A API implementa um sistema de autenticação robusto com refresh token rotation, email verification, password reset e suporte a multi-tenant com isolamento de dados por organização.

### Stack

- **Framework**: NestJS
- **Autenticação**: JWT (access token) + Refresh tokens com rotation
- **Database**: PostgreSQL + Drizzle ORM
- **Email**: Resend
- **Rate Limiting**: @nestjs/throttler
- **Auditoria**: Interceptor automático + logs explícitos

---

## Arquitetura de Dados

### Hierarquia Organizacional

```
Organization (organização/empresa)
└── Clinic (clínica/unidade)
    └── User (usuário com role específico)
```

### Schema de Autenticação

- **users**: Dados do usuário (email, senha, verificação de email, reset de senha)
- **refreshTokens**: Tokens de refresh com rotation (family, revokedAt para detecção de reuso)
- **organizations**: Organizações (contexto multi-tenant)
- **clinics**: Clínicas vinculadas a organizações
- **userClinicRoles**: Relacionamento usuário-clínica com roles (admin, doctor, secretary)
- **auditLogs**: Log automático de todas as ações

---

## Fluxos de Autenticação

### 1. Login

**Endpoint**: `POST /api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123",
  "clinicId": "uuid-opcional"
}
```

**Processo**:

1. Valida credenciais (email + hash da senha)
2. Busca todas as clínicas que o usuário tem acesso
3. Define clínica ativa (preferida ou primeira disponível)
4. Gera JWT access token (15 minutos) contendo:
   - `userId`, `email`
   - `organizationId`, `activeClinicId`
   - `clinicAccess` (lista de clínicas disponíveis com roles)
5. Gera refresh token (opaco, 7 dias) com `family` UUID para rotation
6. Retorna access token no JSON
7. Armazena refresh token em **httpOnly cookie** (seguro contra XSS)
8. Loga login bem-sucedido com IP

**Resposta**:

```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Nome do Usuário",
    "emailVerified": true,
    "activeClinic": {
      "id": "clinic-uuid",
      "name": "Clínica Principal",
      "organizationId": "org-uuid",
      "role": "doctor"
    },
    "availableClinics": [
      { "clinicId": "...", "clinicName": "...", "role": "..." }
    ]
  }
}
```

### 2. Refresh Token Rotation

**Endpoint**: `POST /api/auth/refresh`

**Processo**:

1. Lê refresh token do **httpOnly cookie**
2. Valida se token existe e não expirou
3. **Detecção de roubo**: Se `revokedAt` estiver preenchido, token já foi usado
   - → Revoga **toda a família** de tokens (possível ataque)
   - → Força re-login em todos os dispositivos
4. Marca token atual como revogado (`revokedAt = now()`)
5. Gera novo refresh token na **mesma família**
6. Gera novo access token mantendo o contexto de clínica
7. Define novo refresh token no cookie
8. Retorna novo access token

**Por que rotation?**: Cada uso invalida o anterior. Se um token vazar, é válido apenas 1 vez. Reuso detecta roubo.

### 3. Logout

**Endpoint**: `POST /api/auth/logout`
**Requer**: JWT válido

**Processo**:

1. Lê refresh token do cookie
2. Deleta **toda a família** de refresh tokens (logout de todos os dispositivos)
3. Limpa cookie de refresh token
4. Loga ação com IP

### 4. Switch Context (Trocar Clínica Ativa)

**Endpoint**: `POST /api/auth/switch-context`
**Requer**: JWT válido

```json
{
  "clinicId": "clinic-uuid"
}
```

**Processo**:

1. Valida se usuário tem acesso à clínica
2. Gera novo access token com novo contexto
3. Mantém mesmo refresh token (não afeta sessão)

### 5. Email Verification

**Endpoint Envio**: `POST /api/auth/resend-verification`
**Requer**: JWT válido

**Processo**:

1. Gera token aleatório (32 bytes hex)
2. Define expiração de 24 horas
3. Envia email via Resend com link: `{FRONTEND_URL}/verify-email?token={token}`
4. Frontend faz POST para `/api/auth/verify-email` com token

**Endpoint Verificação**: `POST /api/auth/verify-email`

```json
{
  "token": "token-from-email"
}
```

1. Busca user pelo `emailVerificationToken`
2. Valida expiração
3. Marca `emailVerified = true`
4. Limpa token e expiração

### 6. Password Reset

**Endpoint Solicitação**: `POST /api/auth/forgot-password`

```json
{
  "email": "user@example.com"
}
```

**Processo**:

1. Busca usuário por email
2. **Não revela** se email existe (sempre retorna mensagem genérica)
3. Se existe:
   - Gera token de reset (32 bytes hex)
   - Define expiração de 1 hora
   - Envia email com link: `{FRONTEND_URL}/reset-password?token={token}`
4. Resposta sempre: "Se o email estiver cadastrado, você receberá instruções..."

**Endpoint Reset**: `POST /api/auth/reset-password`

```json
{
  "token": "token-from-email",
  "newPassword": "newPassword123"
}
```

1. Busca user pelo `resetPasswordToken`
2. Valida expiração (1 hora)
3. Faz hash da nova senha (bcrypt com salt 10)
4. Atualiza `passwordHash`
5. **Revoga todos os refresh tokens** do usuário (força re-login)
6. Limpa token e expiração

---

## Signup e Gerenciamento de Usuários

### 7. Signup B2B (Empresa Nova)

**Endpoint**: `POST /api/signup` (Público)

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

**Processo**:

1. Valida dados de entrada (nome org, slug único, email único, senha forte)
2. Cria em transação atômica:
   - Organization
   - Primeira Clinic
   - User (role: admin)
   - UserClinicRole (vincula user à clinic como admin)
3. Gera emailVerificationToken e envia email (fire-and-forget)
4. Gera accessToken e refreshToken
5. Retorna tokens para auto-login

**Resposta**:

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

**Rate Limit**: 3 requisições por minuto

### 8. Enviar Convite

**Endpoint**: `POST /api/invites` (Autenticado - Apenas Admins)

```json
{
  "email": "medico@example.com",
  "name": "Dr. Maria Santos",
  "clinicId": "clinic-uuid",
  "role": "doctor"
}
```

**Processo**:

1. Valida se usuário autenticado é admin da organização
2. Valida se email já existe (retorna erro se sim)
3. Valida se clinic pertence à mesma org do admin
4. Gera token aleatório (32 bytes hex)
5. Cria registro em invites table (expira em 7 dias)
6. Envia email com link: `{FRONTEND_URL}/accept-invite?token={token}`

**Resposta**:

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

**Rate Limit**: 10 requisições por minuto

### 9. Aceitar Convite

**Endpoint**: `POST /api/invites/accept` (Público - Requer token válido)

```json
{
  "token": "token-from-email",
  "password": "senha123"
}
```

**Processo**:

1. Busca invite por token
2. Valida se não expirou (7 dias)
3. Valida se não foi usado
4. Cria em transação atômica:
   - User (com name e email do invite)
   - UserClinicRole (vincula à clinic com role do invite)
   - Marca invite como usado
5. Gera emailVerificationToken e envia email (fire-and-forget)
6. Gera accessToken e refreshToken
7. Retorna tokens para auto-login

**Resposta**:

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

**Rate Limit**: 5 requisições por minuto

### 10. Criar Nova Clínica

**Endpoint**: `POST /api/organizations/:organizationId/clinics` (Autenticado - Apenas Org Admins)

```json
{
  "name": "Unidade Centro"
}
```

**Processo**:

1. Valida se org existe
2. Valida se usuário autenticado é admin da organização
3. Cria clinic vinculada à org
4. Cria userClinicRole (vincula criador como admin da nova clinic)

**Resposta**:

```json
{
  "id": "clinic-uuid",
  "name": "Unidade Centro",
  "organizationId": "org-uuid",
  "createdAt": "2026-02-07T10:00:00Z"
}
```

**Rate Limit**: 10 requisições por minuto

### 11. Adicionar Usuário a Clínica

**Endpoint**: `POST /api/clinics/:clinicId/members` (Autenticado - Apenas Admins da Org ou Clinic)

```json
{
  "userId": "user-uuid",
  "role": "secretary"
}
```

**Processo**:

1. Valida se clinic existe
2. Valida se user existe
3. Valida se usuário autenticado é admin da org ou clinic
4. Valida se user já não está vinculado à clinic
5. Cria userClinicRole

**Resposta**:

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

**Rate Limit**: 10 requisições por minuto

---

## Multi-Tenant

### Context Switching

Cada usuário pode estar em múltiplas clínicas. O contexto é armazenado no JWT:

- `activeClinicId`: Clínica ativa atual
- `organizationId`: Organização da clínica ativa
- `clinicAccess`: Lista de clínicas disponíveis

**Trocar clínica**: `POST /api/auth/switch-context` → novo access token com novo contexto.

### Row-Level Security (RLS)

**Middleware**: `RlsMiddleware` configura o contexto PostgreSQL:

```sql
SELECT set_config('app.current_org_id', organization_id, true)
```

**Policies** (no DB):

- `clinic_org_isolation`: Clínicas isoladas por organização
- `clinic_user_org_isolation`: Usuários só veem clínicas da sua org

Sem o contexto correto, queries retornam dados vazios (segurança em camada DB).

---

## Rate Limiting

### Limites Globais

| Ambiente | short (1s) | medium (60s) |
| -------- | ---------- | ------------ |
| Dev      | 1000 req   | 1000 req     |
| Prod     | 3 req      | 60 req       |

### Limites Específicos de Auth

| Endpoint                | Limite     |
| ----------------------- | ---------- |
| `/auth/login`           | 5 req/min  |
| `/auth/refresh`         | 20 req/min |
| `/auth/forgot-password` | 3 req/min  |
| `/auth/reset-password`  | 5 req/min  |

**Resposta ao limite**: HTTP 429 (Too Many Requests)

---

## Auditoria

### Logs Automáticos

O `AuditInterceptor` loga automaticamente **toda ação autenticada**:

- Quem (userId)
- O quê (action: READ, CREATE, UPDATE, DELETE)
- Onde (resource: URL path)
- Quando (timestamp)
- De onde (IP)
- Em qual contexto (organizationId, clinicId)

### Logs Explícitos

Auth eventos especiais logados no `auth.service.ts`:

- `LOGIN` (sucesso)
- `LOGIN_FAILED` (credenciais inválidas)
- `LOGOUT`

**Tabela**: `audit_logs` com campos: `userId`, `action`, `resource`, `method`, `statusCode`, `ip`, `userAgent`, `organizationId`, `clinicId`, `metadata`, `createdAt`

---

## Testando os Fluxos

### Configuração Inicial

```bash
cd apps/api
pnpm install
pnpm db:migrate  # Aplicar migrations
```

**Variáveis de Ambiente** (`.env`):

```env
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/healz
JWT_SECRET=sua-secret-key-para-testes
RESEND_API_KEY=re_xxxxxxxx  # Obter em https://resend.com/api-keys
FRONTEND_URL=http://localhost:3000
```

### 1. Login e Refresh Token Rotation

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@clinic.com","password":"password123"}' \
  -v

# Resposta inclui:
# - accessToken (no JSON)
# - Set-Cookie: refreshToken (httpOnly)

# Refresh (lê cookie automaticamente)
curl -X POST http://localhost:3001/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt \
  -H "Content-Type: application/json"

# Retorna novo accessToken e atualiza cookie de refreshToken
```

### 2. Detecção de Reuso de Token

```bash
# Login e guardar tokens
RESPONSE=$(curl -s -c cookies.txt \
  -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@clinic.com","password":"password123"}')

ACCESS_TOKEN=$(echo $RESPONSE | jq -r '.accessToken')

# Refresh 1x (sucesso)
curl -X POST http://localhost:3001/api/auth/refresh \
  -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json"

# Tentar usar token antigo novamente
# Extrair o refresh token anterior e fazer outro refresh com ele
# → HTTP 401: "Token reuse detected. All sessions revoked."
```

### 3. Email Verification

```bash
# Enviar email de verificação (requer autenticação)
curl -X POST http://localhost:3001/api/auth/resend-verification \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# Email é enviado via Resend
# Verificar token na resposta (em dev, ou no log do Resend)

# Verificar email
curl -X POST http://localhost:3001/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"token-from-email"}'

# Resposta: {"message":"Email verificado com sucesso"}
```

### 4. Password Reset

```bash
# Solicitar reset (não requer autenticação)
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@clinic.com"}'

# Resposta: sempre sucesso (previne enumeração)
# Email é enviado via Resend

# Verificar token no Resend ou no log

# Reset password
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"token-from-email","newPassword":"newPassword123"}'

# Depois: fazer login com nova senha
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@clinic.com","password":"newPassword123"}'
```

### 5. Context Switching

```bash
# Fazer login (retorna clinicAccess disponíveis)
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@clinic.com","password":"password123"}')

AVAILABLE=$(echo $RESPONSE | jq '.user.availableClinics')
OTHER_CLINIC=$(echo $AVAILABLE | jq -r '.[1].clinicId')

# Trocar para outra clínica
curl -X POST http://localhost:3001/api/auth/switch-context \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clinicId\":\"$OTHER_CLINIC\"}"

# Novo access token com novo contexto
```

### 6. Rate Limiting

```bash
# Tentar login 6 vezes em 1 minuto (limite: 5)
for i in {1..6}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}')
  echo "Tentativa $i: $STATUS"
done

# 6ª tentativa retorna: 429 (Too Many Requests)
```

### 7. Logout

```bash
# Logout (requer JWT válido e refresh token no cookie)
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -b cookies.txt

# Resposta: 204 No Content
# Cookie de refreshToken é limpo

# Tentar refresh com token revogado
curl -X POST http://localhost:3001/api/auth/refresh \
  -b cookies.txt
# → HTTP 401: "Invalid refresh token"
```

### 8. Auditoria

```bash
# Toda ação autenticada é logada automaticamente
# Verificar logs (exemplo com psql):
psql -U user -d healz -c "
  SELECT
    created_at,
    user_id,
    action,
    resource,
    status_code,
    ip
  FROM audit_logs
  WHERE created_at > NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC;
"
```

### 9. Signup B2B

```bash
# Signup de nova organização
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
  }' \
  -v

# Resposta inclui:
# - accessToken (no JSON)
# - Set-Cookie: refreshToken (httpOnly)
# - Dados do usuário, clínica e organização criados
```

### 10. Enviar Convite

```bash
# Enviar convite (requer autenticação como admin)
curl -X POST http://localhost:3001/api/invites \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "medico@example.com",
    "name": "Dr. Maria Santos",
    "clinicId": "clinic-uuid",
    "role": "doctor"
  }'

# Resposta: confirmação de convite enviado
# Email é enviado via Resend com link de aceitação
```

### 11. Aceitar Convite

```bash
# Aceitar convite com token do email
curl -X POST http://localhost:3001/api/invites/accept \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token-from-email",
    "password": "senha12345"
  }' \
  -v

# Resposta inclui:
# - accessToken (no JSON)
# - Set-Cookie: refreshToken (httpOnly)
# - Auto-login após aceitar convite
```

### 12. Criar Nova Clínica

```bash
# Criar clínica em organização existente (requer admin)
curl -X POST http://localhost:3001/api/organizations/$ORG_ID/clinics \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unidade Centro"
  }'

# Resposta: dados da nova clínica criada
# Criador é automaticamente adicionado como admin
```

### 13. Adicionar Membro a Clínica

```bash
# Adicionar usuário existente a clínica (requer admin da org ou clínica)
curl -X POST http://localhost:3001/api/clinics/$CLINIC_ID/members \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "role": "secretary"
  }'

# Resposta: confirmação de membro adicionado
```

---

## Segurança

### Implementado

✅ **Senhas**: Hashadas com bcrypt (salt 10)
✅ **JWT**: Assinados com secret, expiração 15 min
✅ **Refresh Tokens**: Opacos (não JWTs), rotation a cada uso
✅ **Detecção de Roubo**: Reuso de token revoga toda a sessão
✅ **Email Verification**: Links com token de 24h
✅ **Password Reset**: Links com token de 1h, revoga sessões anteriores
✅ **Rate Limiting**: Brute force protection nos endpoints críticos
✅ **RLS**: Row-level security no PostgreSQL
✅ **Cookies**: httpOnly, secure (prod), SameSite=strict
✅ **Auditoria**: Log automático de todas as ações
✅ **Email Enumeration**: Resposta genérica no forgot-password

### Implementado Recentemente

- [x] **Signup e Gerenciamento de Usuários** (implementado 2026-02-07)
  - POST /api/signup - Signup B2B (criar organização + clínica + admin)
  - POST /api/invites - Enviar convite para novo usuário
  - POST /api/invites/accept - Aceitar convite e criar conta
  - POST /api/organizations/:id/clinics - Criar nova clínica
  - POST /api/clinics/:id/members - Adicionar usuário a clínica

### Melhorias Futuras

- [ ] 2FA (TOTP/SMS)
- [ ] Device management (controlar quais dispositivos podem acessar)
- [ ] IP whitelist/blacklist
- [ ] Detecção de anomalias (login de IPs suspeitos)
- [ ] Session timeout dinâmico (atividade)

---

## Troubleshooting

### Problema: "Invalid refresh token"

- **Causa**: Refresh token expirou (7 dias) ou foi revogado
- **Solução**: Fazer login novamente

### Problema: "Token reuse detected. All sessions revoked."

- **Causa**: Token de refresh foi reutilizado (possível roubo detectado)
- **Resultado**: Todas as sessões do usuário foram revogadas por segurança
- **Solução**: Fazer login novamente e investigar possível compromissão

### Problema: "Email não verificado" (se guard ativo)

- **Causa**: Email não foi verificado ainda
- **Solução**: Chamar `/api/auth/resend-verification` para reenviar email

### Problema: "User does not have access to this clinic"

- **Causa**: Usuário não está vinculado à clínica ou a clínica foi deletada
- **Solução**: Verificar no DB se `userClinicRoles` existe para o par (userId, clinicId)

### Problema: Rate limiting em desenvolvimento

- **Causa**: Atingiu limite global (normalmente alto em dev, mas pode estar configurado diferente)
- **Solução**: Esperar 1 minuto ou ajustar `NODE_ENV` ou aumentar limites em `app.module.ts`

---

## Referências

- Documentação de implementação: `docs/plans/AUTH_MULTI_TENANT_IMPLEMENTATION.md`
- Planos de features implementadas: `docs/plans/0[1-6]-*.md`
- Plano de signup e gerenciamento de usuários: `docs/plans/07-signup-and-user-management.md`
- Código-fonte:
  - `apps/api/src/auth/` - Autenticação
  - `apps/api/src/audit/` - Auditoria
  - `apps/api/src/mail/` - Email
  - `apps/api/src/db/schema/` - Schema DB

# Plano de Testes - Autenticação e Fluxos Platform Admin

**Data:** 2026-02-08
**Objetivo:** Testar todos os endpoints da API com foco nos fluxos de Platform Admin
**Base URL:** http://localhost:3001/api/v1

---

## 📋 Índice

1. [Mapeamento de Endpoints](#mapeamento-de-endpoints)
2. [Casos de Teste](#casos-de-teste)
3. [Cenários de Teste](#cenários-de-teste)
4. [Checklist de Execução](#checklist-de-execução)
5. [Registro de Problemas](#registro-de-problemas)

---

## 🗺️ Mapeamento de Endpoints

### 1. Health
- `GET /health` - Health check

### 2. Authentication
- `POST /auth/login` - Login de usuário
- `POST /auth/switch-context` - Trocar contexto de clínica (🔒)
- `POST /auth/refresh` - Renovar access token (🔒)
- `POST /auth/logout` - Logout do usuário (🔒)
- `POST /auth/verify-email` - Verificar email
- `POST /auth/resend-verification` - Reenviar email de verificação (🔒)
- `POST /auth/forgot-password` - Solicitar reset de senha
- `POST /auth/reset-password` - Resetar senha

### 3. Signup
- `POST /signup` - Criar nova organização (Signup B2B)

### 4. Invites
- `POST /invites` - Enviar convite para novo usuário (🔒)
- `POST /invites/accept` - Aceitar convite

### 5. Organizations (Multi-tenant)
- `POST /organizations/{organizationId}/clinics` - Criar clínica (🔒)

### 6. Clinics (Multi-tenant)
- `POST /clinics/{clinicId}/members` - Adicionar membro (🔒)

### 7. Platform Admin - Organizations
- `GET /platform-admin/organizations` - Listar organizações (🔒 Platform Admin)
- `POST /platform-admin/organizations` - Criar organização manualmente (🔒 Platform Admin)
- `GET /platform-admin/organizations/{id}` - Ver detalhes da organização (🔒 Platform Admin)
- `PATCH /platform-admin/organizations/{id}` - Editar organização (🔒 Platform Admin)
- `PATCH /platform-admin/organizations/{id}/status` - Ativar/Desativar organização (🔒 Platform Admin)

### 8. Platform Admin - Clinics
- `GET /platform-admin/clinics` - Listar clínicas (🔒 Platform Admin)
- `POST /platform-admin/clinics` - Criar clínica (🔒 Platform Admin)
- `GET /platform-admin/clinics/{id}` - Ver detalhes da clínica (🔒 Platform Admin)
- `PATCH /platform-admin/clinics/{id}` - Editar clínica (🔒 Platform Admin)
- `PATCH /platform-admin/clinics/{id}/transfer` - Transferir clínica para outra organização (🔒 Platform Admin)
- `PATCH /platform-admin/clinics/{id}/status` - Ativar/Desativar clínica (🔒 Platform Admin)

### 9. Platform Admin - Users
- `GET /platform-admin/users` - Listar usuários (🔒 Platform Admin)
- `POST /platform-admin/users` - Criar usuário (🔒 Platform Admin)
- `GET /platform-admin/users/{id}` - Ver detalhes do usuário (🔒 Platform Admin)
- `PATCH /platform-admin/users/{id}` - Editar usuário (🔒 Platform Admin)
- `POST /platform-admin/users/{id}/reset-password` - Resetar senha do usuário (🔒 Platform Admin)
- `POST /platform-admin/users/{id}/verify-email` - Forçar verificação de email (🔒 Platform Admin)
- `PATCH /platform-admin/users/{id}/status` - Ativar/Desativar usuário (🔒 Platform Admin)
- `POST /platform-admin/users/{userId}/clinics` - Adicionar usuário a clínica (🔒 Platform Admin)
- `PATCH /platform-admin/users/{userId}/clinics/{clinicId}` - Atualizar role do usuário na clínica (🔒 Platform Admin)
- `DELETE /platform-admin/users/{userId}/clinics/{clinicId}` - Remover usuário da clínica (🔒 Platform Admin)

### 10. Platform Admin - Support
- `POST /platform-admin/users/{id}/impersonate` - Impersonar usuário (Login As) (🔒 Platform Admin)
- `POST /platform-admin/users/{id}/revoke-sessions` - Revogar todas as sessões do usuário (🔒 Platform Admin)

### 11. Platform Admin - Admins
- `GET /platform-admin/admins` - Listar platform admins (🔒 Platform Admin)
- `POST /platform-admin/admins` - Criar novo platform admin (🔒 Platform Admin)
- `DELETE /platform-admin/admins/{id}` - Revogar permissões de platform admin (🔒 Platform Admin)

**Legenda:**
- 🔒 = Requer autenticação (Bearer token)
- 🔒 Platform Admin = Requer autenticação + permissões de Platform Admin

---

## 🧪 Casos de Teste

### Fase 1: Setup Inicial

#### CT-001: Health Check
**Endpoint:** `GET /health`
**Objetivo:** Verificar se a API está online
**Passos:**
1. Fazer requisição GET para `/health`
2. Verificar status 200
3. Verificar resposta contém `status: "ok"` e `timestamp`

**Resultado Esperado:** Status 200 com health check ok

---

#### CT-002: Criar Organização via Signup
**Endpoint:** `POST /signup`
**Objetivo:** Criar uma organização de teste para usar nos testes
**Passos:**
1. Fazer requisição POST para `/signup` com:
   ```json
   {
     "organization": {
       "name": "Test Organization",
       "slug": "test-org-001"
     },
     "clinic": {
       "name": "Test Clinic"
     },
     "user": {
       "name": "Test User",
       "email": "test@example.com",
       "password": "password123"
     }
   }
   ```
2. Verificar status 201
3. Armazenar `accessToken`, `user.id`, `organization.id`, `activeClinic.id`

**Resultado Esperado:** Status 201 com tokens e dados da organização criada

---

#### CT-003: Criar Platform Admin
**Endpoint:** `POST /platform-admin/admins`
**Objetivo:** Promover o usuário de teste a Platform Admin
**Pré-condição:** Precisa haver pelo menos um usuário no sistema com permissões de admin
**Nota:** Este endpoint pode estar protegido e requerer um admin existente. Se não houver seed no banco, pode ser necessário criar via migration ou diretamente no banco.

**Passos:**
1. Autenticar com usuário admin existente
2. Fazer requisição POST para `/platform-admin/admins` com:
   ```json
   {
     "userId": "<user-id-from-signup>"
   }
   ```
3. Verificar status 201

**Resultado Esperado:** Status 201 e usuário promovido a Platform Admin

---

### Fase 2: Autenticação

#### CT-004: Login com Credenciais Válidas
**Endpoint:** `POST /auth/login`
**Objetivo:** Testar login com credenciais corretas
**Passos:**
1. Fazer requisição POST para `/auth/login` com:
   ```json
   {
     "email": "test@example.com",
     "password": "password123"
   }
   ```
2. Verificar status 200
3. Verificar resposta contém `accessToken` e `user`
4. Armazenar `accessToken` para uso posterior

**Resultado Esperado:** Status 200 com access token válido

---

#### CT-005: Login com Credenciais Inválidas
**Endpoint:** `POST /auth/login`
**Objetivo:** Testar segurança do login
**Passos:**
1. Fazer requisição POST para `/auth/login` com senha incorreta
2. Verificar status 401
3. Verificar mensagem de erro adequada

**Resultado Esperado:** Status 401 com mensagem de erro

---

#### CT-006: Refresh Token
**Endpoint:** `POST /auth/refresh`
**Objetivo:** Testar renovação de token
**Passos:**
1. Fazer requisição POST para `/auth/refresh`
2. Verificar status 200
3. Verificar novo `accessToken` retornado
4. Verificar que o novo token é diferente do anterior

**Resultado Esperado:** Status 200 com novo access token válido

---

#### CT-007: Logout
**Endpoint:** `POST /auth/logout`
**Objetivo:** Testar logout e invalidação de tokens
**Passos:**
1. Autenticar com token válido
2. Fazer requisição POST para `/auth/logout`
3. Verificar status 204
4. Tentar fazer requisição com token antigo
5. Verificar que token foi invalidado (status 401)

**Resultado Esperado:** Status 204 e token invalidado

---

### Fase 3: Platform Admin - Organizations

#### CT-008: Listar Organizações
**Endpoint:** `GET /platform-admin/organizations`
**Objetivo:** Listar todas as organizações com paginação
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição GET para `/platform-admin/organizations`
3. Verificar status 200
4. Verificar estrutura de paginação (page, limit, total, data)
5. Verificar que organização criada no CT-002 está na lista

**Resultado Esperado:** Status 200 com lista paginada de organizações

---

#### CT-009: Listar Organizações com Filtros
**Endpoint:** `GET /platform-admin/organizations?search=test&status=active&sortBy=name&sortOrder=asc&page=1&limit=10`
**Objetivo:** Testar filtros, busca e ordenação
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição GET com query params
3. Verificar status 200
4. Verificar que apenas organizações correspondentes aos filtros são retornadas
5. Verificar ordenação correta

**Resultado Esperado:** Status 200 com resultados filtrados

---

#### CT-010: Ver Detalhes da Organização
**Endpoint:** `GET /platform-admin/organizations/{id}`
**Objetivo:** Obter detalhes completos de uma organização
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição GET para `/platform-admin/organizations/{org-id}`
3. Verificar status 200
4. Verificar que retorna informações completas (clínicas, admins, etc)

**Resultado Esperado:** Status 200 com detalhes completos da organização

---

#### CT-011: Criar Organização Manualmente
**Endpoint:** `POST /platform-admin/organizations`
**Objetivo:** Platform Admin criar nova organização
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição POST para `/platform-admin/organizations` com:
   ```json
   {
     "name": "Test Org 2",
     "slug": "test-org-002",
     "initialClinic": {
       "name": "Initial Clinic"
     },
     "initialAdmin": {
       "name": "Admin User",
       "email": "admin@testorg2.com",
       "sendInvite": true
     }
   }
   ```
3. Verificar status 201
4. Armazenar ID da nova organização

**Resultado Esperado:** Status 201 com organização criada

---

#### CT-012: Editar Organização
**Endpoint:** `PATCH /platform-admin/organizations/{id}`
**Objetivo:** Atualizar dados da organização
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição PATCH para `/platform-admin/organizations/{org-id}` com:
   ```json
   {
     "name": "Updated Organization Name",
     "slug": "updated-org-slug"
   }
   ```
3. Verificar status 200
4. Buscar organização e verificar alterações

**Resultado Esperado:** Status 200 e organização atualizada

---

#### CT-013: Desativar Organização
**Endpoint:** `PATCH /platform-admin/organizations/{id}/status`
**Objetivo:** Desativar organização e suas clínicas
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição PATCH para `/platform-admin/organizations/{org-id}/status` com:
   ```json
   {
     "status": "inactive",
     "reason": "Testing deactivation"
   }
   ```
3. Verificar status 200
4. Verificar que clínicas da organização também foram desativadas

**Resultado Esperado:** Status 200 e organização desativada

---

#### CT-014: Reativar Organização
**Endpoint:** `PATCH /platform-admin/organizations/{id}/status`
**Objetivo:** Reativar organização
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição PATCH para `/platform-admin/organizations/{org-id}/status` com:
   ```json
   {
     "status": "active",
     "reason": "Testing reactivation"
   }
   ```
3. Verificar status 200

**Resultado Esperado:** Status 200 e organização reativada

---

### Fase 4: Platform Admin - Clinics

#### CT-015: Listar Clínicas
**Endpoint:** `GET /platform-admin/clinics`
**Objetivo:** Listar todas as clínicas do sistema
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição GET para `/platform-admin/clinics`
3. Verificar status 200
4. Verificar estrutura de paginação

**Resultado Esperado:** Status 200 com lista paginada de clínicas

---

#### CT-016: Listar Clínicas com Filtros
**Endpoint:** `GET /platform-admin/clinics?search=test&organizationId={org-id}&status=active&sortBy=name`
**Objetivo:** Testar filtros de clínicas
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição GET com query params
3. Verificar status 200
4. Verificar que apenas clínicas correspondentes aos filtros são retornadas

**Resultado Esperado:** Status 200 com resultados filtrados

---

#### CT-017: Ver Detalhes da Clínica
**Endpoint:** `GET /platform-admin/clinics/{id}`
**Objetivo:** Obter detalhes completos de uma clínica
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição GET para `/platform-admin/clinics/{clinic-id}`
3. Verificar status 200
4. Verificar detalhes completos (organização, membros, etc)

**Resultado Esperado:** Status 200 com detalhes completos da clínica

---

#### CT-018: Criar Clínica
**Endpoint:** `POST /platform-admin/clinics`
**Objetivo:** Platform Admin criar nova clínica
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição POST para `/platform-admin/clinics` com:
   ```json
   {
     "organizationId": "{org-id}",
     "name": "New Clinic"
   }
   ```
3. Verificar status 201
4. Armazenar ID da nova clínica

**Resultado Esperado:** Status 201 com clínica criada

---

#### CT-019: Editar Clínica
**Endpoint:** `PATCH /platform-admin/clinics/{id}`
**Objetivo:** Atualizar nome da clínica
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição PATCH para `/platform-admin/clinics/{clinic-id}` com:
   ```json
   {
     "name": "Updated Clinic Name"
   }
   ```
3. Verificar status 200
4. Buscar clínica e verificar alteração

**Resultado Esperado:** Status 200 e clínica atualizada

---

#### CT-020: Desativar Clínica
**Endpoint:** `PATCH /platform-admin/clinics/{id}/status`
**Objetivo:** Desativar clínica
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição PATCH para `/platform-admin/clinics/{clinic-id}/status` com:
   ```json
   {
     "status": "inactive",
     "reason": "Testing clinic deactivation"
   }
   ```
3. Verificar status 200

**Resultado Esperado:** Status 200 e clínica desativada

---

#### CT-021: Reativar Clínica
**Endpoint:** `PATCH /platform-admin/clinics/{id}/status`
**Objetivo:** Reativar clínica
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição PATCH para `/platform-admin/clinics/{clinic-id}/status` com:
   ```json
   {
     "status": "active"
   }
   ```
3. Verificar status 200

**Resultado Esperado:** Status 200 e clínica reativada

---

#### CT-022: Transferir Clínica (Mantendo Usuários)
**Endpoint:** `PATCH /platform-admin/clinics/{id}/transfer`
**Objetivo:** Transferir clínica para outra organização mantendo usuários
**Pré-condição:** Ter duas organizações no sistema
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição PATCH para `/platform-admin/clinics/{clinic-id}/transfer` com:
   ```json
   {
     "targetOrganizationId": "{target-org-id}",
     "keepUsers": true
   }
   ```
3. Verificar status 200
4. Verificar que clínica agora pertence à nova organização
5. Verificar que usuários foram mantidos

**Resultado Esperado:** Status 200 e clínica transferida com usuários

---

#### CT-023: Transferir Clínica (Removendo Usuários)
**Endpoint:** `PATCH /platform-admin/clinics/{id}/transfer`
**Objetivo:** Transferir clínica para outra organização removendo usuários
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição PATCH para `/platform-admin/clinics/{clinic-id}/transfer` com:
   ```json
   {
     "targetOrganizationId": "{target-org-id}",
     "keepUsers": false
   }
   ```
3. Verificar status 200
4. Verificar que clínica agora pertence à nova organização
5. Verificar que usuários foram removidos

**Resultado Esperado:** Status 200 e clínica transferida sem usuários

---

### Fase 5: Platform Admin - Users

#### CT-024: Listar Usuários
**Endpoint:** `GET /platform-admin/users`
**Objetivo:** Listar todos os usuários do sistema
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição GET para `/platform-admin/users`
3. Verificar status 200
4. Verificar estrutura de paginação

**Resultado Esperado:** Status 200 com lista paginada de usuários

---

#### CT-025: Listar Usuários com Filtros
**Endpoint:** `GET /platform-admin/users?search=test&organizationId={org-id}&clinicId={clinic-id}&role=admin&emailVerified=true&status=active`
**Objetivo:** Testar todos os filtros de usuários
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição GET com query params
3. Verificar status 200
4. Verificar que apenas usuários correspondentes aos filtros são retornados

**Resultado Esperado:** Status 200 com resultados filtrados

---

#### CT-026: Ver Detalhes do Usuário
**Endpoint:** `GET /platform-admin/users/{id}`
**Objetivo:** Obter detalhes completos de um usuário
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição GET para `/platform-admin/users/{user-id}`
3. Verificar status 200
4. Verificar detalhes completos (clínicas, roles, etc)

**Resultado Esperado:** Status 200 com detalhes completos do usuário

---

#### CT-027: Criar Usuário com Envio de Convite
**Endpoint:** `POST /platform-admin/users`
**Objetivo:** Platform Admin criar usuário e enviar email de convite
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição POST para `/platform-admin/users` com:
   ```json
   {
     "name": "New User",
     "email": "newuser@example.com",
     "clinicId": "{clinic-id}",
     "role": "doctor",
     "sendInvite": true
   }
   ```
3. Verificar status 201
4. Armazenar ID do novo usuário

**Resultado Esperado:** Status 201 com usuário criado e convite enviado

---

#### CT-028: Criar Usuário com Senha Direta
**Endpoint:** `POST /platform-admin/users`
**Objetivo:** Platform Admin criar usuário com senha definida
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição POST para `/platform-admin/users` com:
   ```json
   {
     "name": "Direct Password User",
     "email": "directuser@example.com",
     "clinicId": "{clinic-id}",
     "role": "secretary",
     "sendInvite": false,
     "password": "password123"
   }
   ```
3. Verificar status 201
4. Tentar fazer login com as credenciais fornecidas

**Resultado Esperado:** Status 201 e usuário pode fazer login imediatamente

---

#### CT-029: Editar Usuário
**Endpoint:** `PATCH /platform-admin/users/{id}`
**Objetivo:** Atualizar dados do usuário
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição PATCH para `/platform-admin/users/{user-id}` com:
   ```json
   {
     "name": "Updated User Name",
     "email": "updatedemail@example.com"
   }
   ```
3. Verificar status 200
4. Buscar usuário e verificar alterações

**Resultado Esperado:** Status 200 e usuário atualizado

---

#### CT-030: Resetar Senha do Usuário (Enviar Email)
**Endpoint:** `POST /platform-admin/users/{id}/reset-password`
**Objetivo:** Admin resetar senha e enviar email
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição POST para `/platform-admin/users/{user-id}/reset-password` com:
   ```json
   {
     "sendEmail": true
   }
   ```
3. Verificar status 201

**Resultado Esperado:** Status 201 e email de reset enviado

---

#### CT-031: Resetar Senha do Usuário (Senha Temporária)
**Endpoint:** `POST /platform-admin/users/{id}/reset-password`
**Objetivo:** Admin resetar senha e retornar senha temporária
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição POST para `/platform-admin/users/{user-id}/reset-password` com:
   ```json
   {
     "sendEmail": false
   }
   ```
3. Verificar status 201
4. Verificar que resposta contém senha temporária
5. Tentar fazer login com senha temporária

**Resultado Esperado:** Status 201 com senha temporária retornada

---

#### CT-032: Forçar Verificação de Email
**Endpoint:** `POST /platform-admin/users/{id}/verify-email`
**Objetivo:** Admin forçar verificação sem token
**Passos:**
1. Autenticar como Platform Admin
2. Criar usuário com email não verificado
3. Fazer requisição POST para `/platform-admin/users/{user-id}/verify-email`
4. Verificar status 201
5. Buscar usuário e verificar que `emailVerified = true`

**Resultado Esperado:** Status 201 e email marcado como verificado

---

#### CT-033: Desativar Usuário
**Endpoint:** `PATCH /platform-admin/users/{id}/status`
**Objetivo:** Desativar usuário e revogar tokens
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição PATCH para `/platform-admin/users/{user-id}/status` com:
   ```json
   {
     "status": "inactive",
     "reason": "Testing user deactivation",
     "revokeTokens": true
   }
   ```
3. Verificar status 200
4. Verificar que usuário não consegue mais fazer login

**Resultado Esperado:** Status 200 e usuário desativado

---

#### CT-034: Reativar Usuário
**Endpoint:** `PATCH /platform-admin/users/{id}/status`
**Objetivo:** Reativar usuário
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição PATCH para `/platform-admin/users/{user-id}/status` com:
   ```json
   {
     "status": "active",
     "revokeTokens": false
   }
   ```
3. Verificar status 200
4. Verificar que usuário pode fazer login novamente

**Resultado Esperado:** Status 200 e usuário reativado

---

#### CT-035: Adicionar Usuário a Clínica
**Endpoint:** `POST /platform-admin/users/{userId}/clinics`
**Objetivo:** Adicionar usuário existente a outra clínica
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição POST para `/platform-admin/users/{user-id}/clinics` com:
   ```json
   {
     "clinicId": "{another-clinic-id}",
     "role": "doctor"
   }
   ```
3. Verificar status 201
4. Buscar usuário e verificar que agora tem acesso a múltiplas clínicas

**Resultado Esperado:** Status 201 e usuário vinculado à nova clínica

---

#### CT-036: Atualizar Role do Usuário na Clínica
**Endpoint:** `PATCH /platform-admin/users/{userId}/clinics/{clinicId}`
**Objetivo:** Alterar role do usuário em uma clínica específica
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição PATCH para `/platform-admin/users/{user-id}/clinics/{clinic-id}` com:
   ```json
   {
     "role": "admin"
   }
   ```
3. Verificar status 200
4. Buscar usuário e verificar que role foi atualizado

**Resultado Esperado:** Status 200 e role atualizado

---

#### CT-037: Remover Usuário da Clínica
**Endpoint:** `DELETE /platform-admin/users/{userId}/clinics/{clinicId}`
**Objetivo:** Remover vínculo do usuário com clínica
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição DELETE para `/platform-admin/users/{user-id}/clinics/{clinic-id}`
3. Verificar status 200
4. Buscar usuário e verificar que não tem mais acesso à clínica

**Resultado Esperado:** Status 200 e usuário removido da clínica

---

### Fase 6: Platform Admin - Support

#### CT-038: Impersonar Usuário
**Endpoint:** `POST /platform-admin/users/{id}/impersonate`
**Objetivo:** Admin gerar token como outro usuário
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição POST para `/platform-admin/users/{user-id}/impersonate`
3. Verificar status 201
4. Verificar que retorna novo `accessToken`
5. Usar o token para fazer requisição autenticada como o usuário
6. Verificar que token expira em 5 minutos

**Resultado Esperado:** Status 201 com token de impersonação válido

---

#### CT-039: Revogar Todas as Sessões do Usuário
**Endpoint:** `POST /platform-admin/users/{id}/revoke-sessions`
**Objetivo:** Admin forçar logout de todos os dispositivos do usuário
**Passos:**
1. Autenticar como Platform Admin
2. Usuário alvo fazer login e obter token
3. Fazer requisição POST para `/platform-admin/users/{user-id}/revoke-sessions`
4. Verificar status 201
5. Tentar usar token antigo do usuário
6. Verificar que token foi invalidado (status 401)

**Resultado Esperado:** Status 201 e todas as sessões revogadas

---

### Fase 7: Platform Admin - Admins

#### CT-040: Listar Platform Admins
**Endpoint:** `GET /platform-admin/admins`
**Objetivo:** Listar todos os platform admins
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição GET para `/platform-admin/admins`
3. Verificar status 200
4. Verificar lista de platform admins

**Resultado Esperado:** Status 200 com lista de platform admins

---

#### CT-041: Criar Platform Admin
**Endpoint:** `POST /platform-admin/admins`
**Objetivo:** Promover usuário a platform admin
**Passos:**
1. Autenticar como Platform Admin
2. Criar usuário normal
3. Fazer requisição POST para `/platform-admin/admins` com:
   ```json
   {
     "userId": "{new-user-id}"
   }
   ```
4. Verificar status 201
5. Verificar que usuário agora tem permissões de admin

**Resultado Esperado:** Status 201 e usuário promovido

---

#### CT-042: Revogar Permissões de Platform Admin
**Endpoint:** `DELETE /platform-admin/admins/{id}`
**Objetivo:** Remover permissões de platform admin
**Passos:**
1. Autenticar como Platform Admin
2. Fazer requisição DELETE para `/platform-admin/admins/{admin-id}`
3. Verificar status 200
4. Verificar que usuário não tem mais acesso aos endpoints de platform admin

**Resultado Esperado:** Status 200 e permissões revogadas

---

### Fase 8: Testes de Segurança

#### CT-043: Acesso sem Autenticação
**Objetivo:** Verificar que endpoints protegidos retornam 401
**Passos:**
1. Fazer requisições para endpoints protegidos sem header Authorization
2. Verificar que todos retornam status 401

**Resultado Esperado:** Status 401 em todos os endpoints protegidos

---

#### CT-044: Acesso com Token Inválido
**Objetivo:** Verificar validação de token
**Passos:**
1. Fazer requisições com token malformado ou expirado
2. Verificar que retorna status 401

**Resultado Esperado:** Status 401 com mensagem de erro

---

#### CT-045: Acesso sem Permissões de Platform Admin
**Objetivo:** Verificar que usuários normais não acessam endpoints de admin
**Passos:**
1. Autenticar como usuário normal (não platform admin)
2. Tentar acessar endpoints de `/platform-admin/*`
3. Verificar que retorna status 403 (Forbidden)

**Resultado Esperado:** Status 403 em todos os endpoints de platform admin

---

#### CT-046: Rate Limiting - Login
**Objetivo:** Testar rate limiting em endpoints de autenticação
**Passos:**
1. Fazer mais de 5 requisições de login em 1 minuto
2. Verificar que retorna status 429 (Too Many Requests)

**Resultado Esperado:** Status 429 após exceder limite

---

#### CT-047: Rate Limiting - Forgot Password
**Objetivo:** Testar rate limiting em forgot password
**Passos:**
1. Fazer mais de 3 requisições de forgot password em 1 minuto
2. Verificar que retorna status 429

**Resultado Esperado:** Status 429 após exceder limite

---

### Fase 9: Fluxos Multi-tenant

#### CT-048: Context Switching
**Endpoint:** `POST /auth/switch-context`
**Objetivo:** Testar troca de contexto entre clínicas
**Pré-condição:** Usuário tem acesso a múltiplas clínicas
**Passos:**
1. Autenticar usuário com múltiplas clínicas
2. Fazer requisição POST para `/auth/switch-context` com:
   ```json
   {
     "clinicId": "{another-clinic-id}"
   }
   ```
3. Verificar status 200
4. Verificar que novo token contém contexto atualizado

**Resultado Esperado:** Status 200 com novo token e contexto trocado

---

#### CT-049: Enviar Convite
**Endpoint:** `POST /invites`
**Objetivo:** Admin de clínica enviar convite
**Passos:**
1. Autenticar como admin de clínica
2. Fazer requisição POST para `/invites` com:
   ```json
   {
     "email": "invited@example.com",
     "name": "Invited User",
     "clinicId": "{clinic-id}",
     "role": "doctor"
   }
   ```
3. Verificar status 201
4. Armazenar token de convite (se disponível na resposta)

**Resultado Esperado:** Status 201 e email de convite enviado

---

#### CT-050: Aceitar Convite
**Endpoint:** `POST /invites/accept`
**Objetivo:** Usuário convidado aceitar convite
**Pré-condição:** Token de convite válido
**Passos:**
1. Fazer requisição POST para `/invites/accept` com:
   ```json
   {
     "token": "{invite-token}",
     "password": "newpassword123"
   }
   ```
2. Verificar status 200
3. Verificar que retorna access token
4. Fazer login com novas credenciais

**Resultado Esperado:** Status 200 e conta criada com sucesso

---

#### CT-051: Adicionar Membro à Clínica
**Endpoint:** `POST /clinics/{clinicId}/members`
**Objetivo:** Admin adicionar membro existente à clínica
**Passos:**
1. Autenticar como admin da organização
2. Fazer requisição POST para `/clinics/{clinic-id}/members` com:
   ```json
   {
     "userId": "{existing-user-id}",
     "role": "secretary"
   }
   ```
3. Verificar status 201

**Resultado Esperado:** Status 201 e membro adicionado

---

#### CT-052: Criar Clínica dentro de Organização
**Endpoint:** `POST /organizations/{organizationId}/clinics`
**Objetivo:** Admin criar nova clínica
**Passos:**
1. Autenticar como admin da organização
2. Fazer requisição POST para `/organizations/{org-id}/clinics` com:
   ```json
   {
     "name": "Org Clinic"
   }
   ```
3. Verificar status 201

**Resultado Esperado:** Status 201 e clínica criada

---

### Fase 10: Fluxo de Reset de Senha

#### CT-053: Forgot Password
**Endpoint:** `POST /auth/forgot-password`
**Objetivo:** Solicitar reset de senha
**Passos:**
1. Fazer requisição POST para `/auth/forgot-password` com:
   ```json
   {
     "email": "test@example.com"
   }
   ```
2. Verificar status 200
3. Verificar mensagem genérica (não revela se email existe)

**Resultado Esperado:** Status 200 com mensagem genérica

---

#### CT-054: Reset Password com Token Válido
**Endpoint:** `POST /auth/reset-password`
**Objetivo:** Resetar senha com token válido
**Pré-condição:** Token de reset válido
**Passos:**
1. Fazer requisição POST para `/auth/reset-password` com:
   ```json
   {
     "token": "{reset-token}",
     "password": "newpassword123"
   }
   ```
2. Verificar status 200
3. Tentar fazer login com nova senha

**Resultado Esperado:** Status 200 e senha alterada

---

#### CT-055: Reset Password com Token Inválido
**Endpoint:** `POST /auth/reset-password`
**Objetivo:** Testar validação de token
**Passos:**
1. Fazer requisição POST com token inválido ou expirado
2. Verificar status 400
3. Verificar mensagem de erro

**Resultado Esperado:** Status 400 com mensagem de erro

---

### Fase 11: Fluxo de Verificação de Email

#### CT-056: Verificar Email com Token Válido
**Endpoint:** `POST /auth/verify-email`
**Objetivo:** Verificar email com token
**Pré-condição:** Token de verificação válido
**Passos:**
1. Fazer requisição POST para `/auth/verify-email` com:
   ```json
   {
     "token": "{verification-token}"
   }
   ```
2. Verificar status 200
3. Fazer login e verificar que `emailVerified = true`

**Resultado Esperado:** Status 200 e email verificado

---

#### CT-057: Reenviar Email de Verificação
**Endpoint:** `POST /auth/resend-verification`
**Objetivo:** Reenviar email de verificação
**Passos:**
1. Autenticar como usuário com email não verificado
2. Fazer requisição POST para `/auth/resend-verification`
3. Verificar status 200

**Resultado Esperado:** Status 200 e email reenviado

---

#### CT-058: Verificar Email com Token Inválido
**Endpoint:** `POST /auth/verify-email`
**Objetivo:** Testar validação de token
**Passos:**
1. Fazer requisição POST com token inválido
2. Verificar status 400

**Resultado Esperado:** Status 400 com mensagem de erro

---

## 🎯 Cenários de Teste

### Cenário 1: Jornada Completa do Platform Admin

**Objetivo:** Testar fluxo completo de administração da plataforma

**Passos:**
1. Login como Platform Admin
2. Criar nova organização
3. Ver detalhes da organização
4. Criar clínica dentro da organização
5. Criar usuário admin para a clínica
6. Adicionar usuário à clínica
7. Impersonar usuário
8. Fazer ação como usuário impersonado
9. Voltar como Platform Admin
10. Desativar usuário
11. Reativar usuário
12. Transferir clínica para outra organização
13. Desativar organização
14. Reativar organização

**Resultado Esperado:** Todos os passos executam com sucesso

---

### Cenário 2: Jornada de Signup até Operação

**Objetivo:** Testar fluxo completo de novo cliente

**Passos:**
1. Signup de nova organização
2. Verificar email (se disponível)
3. Login
4. Criar nova clínica
5. Enviar convite para novo usuário
6. Aceitar convite
7. Login com novo usuário
8. Verificar contexto correto
9. Trocar contexto (se múltiplas clínicas)

**Resultado Esperado:** Fluxo completo funciona sem erros

---

### Cenário 3: Gestão de Múltiplas Clínicas

**Objetivo:** Testar usuário com acesso a múltiplas clínicas

**Passos:**
1. Criar usuário
2. Adicionar usuário a clínica A como admin
3. Adicionar usuário a clínica B como doctor
4. Adicionar usuário a clínica C como secretary
5. Login do usuário
6. Verificar lista de clínicas disponíveis
7. Trocar contexto para cada clínica
8. Verificar que permissões são diferentes em cada contexto
9. Remover usuário de clínica B
10. Verificar que não tem mais acesso à clínica B

**Resultado Esperado:** Gestão multi-clínica funciona corretamente

---

### Cenário 4: Segurança e Isolamento

**Objetivo:** Verificar isolamento entre organizações e clínicas

**Passos:**
1. Criar Organização A com Clínica A1
2. Criar Organização B com Clínica B1
3. Criar usuário em Clínica A1
4. Tentar acessar dados de Clínica B1 com usuário de A1
5. Verificar que acesso é negado
6. Criar Platform Admin
7. Verificar que Platform Admin tem acesso a ambas

**Resultado Esperado:** Isolamento correto entre organizações

---

## ✅ Checklist de Execução

### Setup
- [ ] API está rodando em http://localhost:3001
- [ ] Banco de dados está limpo ou com seed conhecido
- [ ] Ferramentas de teste prontas (Postman/Insomnia/curl/scripts)

### Fase 1: Setup Inicial
- [ ] CT-001: Health Check
- [ ] CT-002: Criar Organização via Signup
- [ ] CT-003: Criar Platform Admin

### Fase 2: Autenticação
- [ ] CT-004: Login com Credenciais Válidas
- [ ] CT-005: Login com Credenciais Inválidas
- [ ] CT-006: Refresh Token
- [ ] CT-007: Logout

### Fase 3: Platform Admin - Organizations
- [ ] CT-008: Listar Organizações
- [ ] CT-009: Listar Organizações com Filtros
- [ ] CT-010: Ver Detalhes da Organização
- [ ] CT-011: Criar Organização Manualmente
- [ ] CT-012: Editar Organização
- [ ] CT-013: Desativar Organização
- [ ] CT-014: Reativar Organização

### Fase 4: Platform Admin - Clinics
- [ ] CT-015: Listar Clínicas
- [ ] CT-016: Listar Clínicas com Filtros
- [ ] CT-017: Ver Detalhes da Clínica
- [ ] CT-018: Criar Clínica
- [ ] CT-019: Editar Clínica
- [ ] CT-020: Desativar Clínica
- [ ] CT-021: Reativar Clínica
- [ ] CT-022: Transferir Clínica (Mantendo Usuários)
- [ ] CT-023: Transferir Clínica (Removendo Usuários)

### Fase 5: Platform Admin - Users
- [ ] CT-024: Listar Usuários
- [ ] CT-025: Listar Usuários com Filtros
- [ ] CT-026: Ver Detalhes do Usuário
- [ ] CT-027: Criar Usuário com Envio de Convite
- [ ] CT-028: Criar Usuário com Senha Direta
- [ ] CT-029: Editar Usuário
- [ ] CT-030: Resetar Senha do Usuário (Enviar Email)
- [ ] CT-031: Resetar Senha do Usuário (Senha Temporária)
- [ ] CT-032: Forçar Verificação de Email
- [ ] CT-033: Desativar Usuário
- [ ] CT-034: Reativar Usuário
- [ ] CT-035: Adicionar Usuário a Clínica
- [ ] CT-036: Atualizar Role do Usuário na Clínica
- [ ] CT-037: Remover Usuário da Clínica

### Fase 6: Platform Admin - Support
- [ ] CT-038: Impersonar Usuário
- [ ] CT-039: Revogar Todas as Sessões do Usuário

### Fase 7: Platform Admin - Admins
- [ ] CT-040: Listar Platform Admins
- [ ] CT-041: Criar Platform Admin
- [ ] CT-042: Revogar Permissões de Platform Admin

### Fase 8: Testes de Segurança
- [ ] CT-043: Acesso sem Autenticação
- [ ] CT-044: Acesso com Token Inválido
- [ ] CT-045: Acesso sem Permissões de Platform Admin
- [ ] CT-046: Rate Limiting - Login
- [ ] CT-047: Rate Limiting - Forgot Password

### Fase 9: Fluxos Multi-tenant
- [ ] CT-048: Context Switching
- [ ] CT-049: Enviar Convite
- [ ] CT-050: Aceitar Convite
- [ ] CT-051: Adicionar Membro à Clínica
- [ ] CT-052: Criar Clínica dentro de Organização

### Fase 10: Fluxo de Reset de Senha
- [ ] CT-053: Forgot Password
- [ ] CT-054: Reset Password com Token Válido
- [ ] CT-055: Reset Password com Token Inválido

### Fase 11: Fluxo de Verificação de Email
- [ ] CT-056: Verificar Email com Token Válido
- [ ] CT-057: Reenviar Email de Verificação
- [ ] CT-058: Verificar Email com Token Inválido

### Cenários Completos
- [ ] Cenário 1: Jornada Completa do Platform Admin
- [ ] Cenário 2: Jornada de Signup até Operação
- [ ] Cenário 3: Gestão de Múltiplas Clínicas
- [ ] Cenário 4: Segurança e Isolamento

---

## 🐛 Registro de Problemas

**Formato:**
```
ID: P-XXX
Caso de Teste: CT-XXX
Severidade: Crítica / Alta / Média / Baixa
Descrição: [Descrição detalhada do problema]
Passos para Reproduzir:
1. ...
2. ...
Resultado Esperado: [O que deveria acontecer]
Resultado Obtido: [O que realmente aconteceu]
Logs/Screenshots: [Se aplicável]
Status: Aberto / Em Análise / Resolvido / Fechado
```

### Problemas Encontrados

_(Esta seção será preenchida durante a execução dos testes)_

---

## 📊 Sumário de Resultados

**Total de Casos de Teste:** 58
**Total de Cenários:** 4

**Execução:**
- [ ] Testes Planejados
- [ ] Testes em Execução
- [ ] Testes Concluídos

**Resultados:**
- Passou: ___/58
- Falhou: ___/58
- Bloqueado: ___/58
- Não Executado: ___/58

**Taxa de Sucesso:** ___%

---

## 📝 Notas Importantes

### Pré-requisitos
1. API rodando em http://localhost:3001
2. Banco de dados PostgreSQL configurado
3. Email service configurado (ou mock)
4. Pelo menos um Platform Admin no sistema (pode ser via seed ou migration)

### Ferramentas Recomendadas
- **Postman** ou **Insomnia** para execução manual
- **Newman** para automação com Postman Collections
- **k6** ou **Artillery** para testes de carga
- **curl** ou **httpie** para testes rápidos via CLI

### Observações
- Rate limiting pode bloquear testes se executados muito rapidamente
- Alguns endpoints dependem de tokens enviados por email (pode precisar mockar ou pegar no banco)
- Refresh tokens são httpOnly cookies, então precisa de suporte a cookies nos testes
- Tokens de impersonação expiram em 5 minutos
- Desativar organização desativa automaticamente todas as suas clínicas

---

## 🔄 Próximos Passos

Após a execução do plano de testes:

1. ✅ **Documentar todos os problemas encontrados** na seção de Registro de Problemas
2. ✅ **Criar issues no repositório** para cada problema crítico/alto
3. ✅ **Atualizar a documentação da API** com base nos achados
4. ✅ **Criar collection do Postman** com todos os casos de teste
5. ✅ **Automatizar testes críticos** com scripts CI/CD
6. ✅ **Implementar testes E2E** no frontend baseados nestes fluxos
7. ✅ **Revisar e ajustar rate limits** se necessário

---

**Última Atualização:** 2026-02-08
**Responsável:** Platform Admin Team
**Status:** Aguardando Execução

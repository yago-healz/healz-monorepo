# Healz API Documentation

## Overview

Healz API é um sistema de gerenciamento de saúde multi-tenant com controle de acesso baseado em roles (RBAC). A API foi totalmente documentada usando **@nestjs/swagger** e segue as melhores práticas de documentação OpenAPI.

## Acesso à Documentação

Após iniciar o servidor, a documentação interativa do Swagger está disponível em:

```
http://localhost:3001/api/docs
```

## Tecnologias

- **Framework**: NestJS 10
- **Documentação**: @nestjs/swagger 11.x
- **Autenticação**: Better Auth com JWT Bearer tokens
- **Multi-tenancy**: Row-Level Security (RLS) com contexto de organização/clínica
- **Banco de dados**: PostgreSQL com Drizzle ORM

## Estrutura da API

### Módulos Principais

#### 1. Health (`/health`)
Endpoints de verificação de saúde da API.

- `GET /health` - Verifica se a API está funcionando

#### 2. Authentication (`/api/auth`)
Gerenciamento de autenticação através do Better Auth.

- `POST /api/auth/sign-up` - Criar nova conta
- `POST /api/auth/sign-in` - Login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Obter sessão atual
- `POST /api/auth/verify-email` - Verificar email
- `POST /api/auth/forgot-password` - Solicitar reset de senha
- `POST /api/auth/reset-password` - Resetar senha

#### 3. Organizations (`/organizations`)
Gerenciamento de organizações (multi-tenant).

- `POST /organizations` - Criar nova organização
- `GET /organizations` - Listar organizações do usuário
- `GET /organizations/:id` - Obter detalhes de uma organização
- `POST /organizations/:id/set-active` - Definir organização ativa
- `PUT /organizations/:id` - Atualizar organização (requer role: admin)

#### 4. Clinics (`/clinics`)
Gerenciamento de clínicas dentro das organizações.

- `POST /clinics` - Criar nova clínica (requer role: admin, manager)
- `GET /clinics` - Listar clínicas da organização
- `GET /clinics/:id` - Obter detalhes de uma clínica
- `POST /clinics/:id/set-active` - Definir clínica ativa

#### 5. Members (`/members`)
Gerenciamento de membros das organizações.

- `GET /members` - Listar membros (requer role: admin, manager)
- `POST /members/invite` - Convidar novo membro (requer role: admin, manager)
- `PUT /members/:id/role` - Atualizar role do membro (requer role: admin)
- `DELETE /members/:id` - Remover membro (requer role: admin)

#### 6. Context (`/context`)
Gerenciamento de contexto multi-tenant do usuário.

- `GET /context` - Obter contexto atual (organização/clínica ativa)
- `GET /context/available` - Listar contextos disponíveis
- `POST /context/switch` - Trocar contexto

## Autenticação

A API utiliza **Bearer Token Authentication** (JWT).

### Como autenticar:

1. Faça login via `POST /api/auth/sign-in` com email e senha
2. O Better Auth retornará um token de sessão nos cookies
3. Use o cookie de sessão ou inclua o header:
   ```
   Authorization: Bearer <seu-token>
   ```

### Testando no Swagger

1. Acesse `/api/docs`
2. Clique no botão **Authorize** (cadeado)
3. Insira seu token no formato: `Bearer <seu-token>`
4. Clique em **Authorize**

Agora todos os endpoints protegidos podem ser testados.

## Sistema de Roles

A API implementa RBAC (Role-Based Access Control) com 4 roles:

| Role | Permissões |
|------|------------|
| `admin` | Acesso total: criar/atualizar organizações, gerenciar membros, atualizar roles |
| `manager` | Criar clínicas, convidar membros |
| `doctor` | Acesso a recursos clínicos (a ser implementado) |
| `receptionist` | Acesso básico (a ser implementado) |

### Controle de Acesso

- **AuthGuard**: Valida se o usuário está autenticado
- **RolesGuard**: Valida se o usuário tem as roles necessárias
- Decorators usados:
  - `@Roles('admin', 'manager')` - Define roles permitidas
  - `@CurrentUser()` - Injeta o usuário autenticado
  - `@CurrentOrg()` - Injeta a organização ativa
  - `@CurrentSession()` - Injeta a sessão atual

## Multi-tenancy e Contexto

A API é multi-tenant, permitindo que usuários pertençam a múltiplas organizações e clínicas.

### Como funciona:

1. **Organização Ativa**: Cada sessão tem uma organização ativa
2. **Clínica Ativa**: Opcionalmente, uma clínica específica pode estar ativa
3. **RLS Middleware**: Automaticamente filtra dados com base no contexto

### Trocar contexto:

```bash
POST /context/switch
{
  "organizationId": "uuid-da-organizacao",
  "clinicId": "uuid-da-clinica" # opcional
}
```

## Schemas e DTOs

Todos os DTOs foram documentados com validações e exemplos:

### CreateOrganizationDto
```typescript
{
  name: string;        // 2-100 caracteres
  slug: string;        // URL-friendly, único
}
```

### CreateClinicDto
```typescript
{
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  timezone?: string;   // IANA timezone
}
```

### InviteMemberDto
```typescript
{
  email: string;
  role?: 'admin' | 'manager' | 'doctor' | 'receptionist';
}
```

## Respostas Padrão

Todas as respostas seguem padrões HTTP:

| Status | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 401 | Não autenticado |
| 403 | Sem permissão (role insuficiente) |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |

## Desenvolvimento

### Iniciar servidor:
```bash
pnpm run dev
```

### Acessar documentação:
```
http://localhost:3001/api/docs
```

### Gerar migrações:
```bash
pnpm run db:generate
```

### Aplicar migrações:
```bash
pnpm run db:push
```

## Exemplo de Uso

### 1. Criar conta
```bash
curl -X POST http://localhost:3001/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "senha-segura",
    "name": "Admin User"
  }'
```

### 2. Fazer login
```bash
curl -X POST http://localhost:3001/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "senha-segura"
  }'
```

### 3. Criar organização
```bash
curl -X POST http://localhost:3001/organizations \
  -H "Authorization: Bearer <seu-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Minha Clínica",
    "slug": "minha-clinica"
  }'
```

### 4. Criar clínica
```bash
curl -X POST http://localhost:3001/clinics \
  -H "Authorization: Bearer <seu-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Filial Centro",
    "slug": "filial-centro",
    "phone": "+55 11 1234-5678",
    "email": "centro@minaclinica.com"
  }'
```

## Próximos Passos

- [ ] Implementar módulo de Patients (pacientes)
- [ ] Implementar módulo de Appointments (agendamentos)
- [ ] Adicionar validação de DTOs com class-validator
- [ ] Implementar rate limiting
- [ ] Adicionar testes automatizados (Jest)
- [ ] Implementar webhooks para eventos
- [ ] Adicionar suporte a upload de arquivos

## Suporte

Para questões ou problemas, consulte:
- Documentação do NestJS: https://docs.nestjs.com
- Documentação do Better Auth: https://better-auth.com
- Swagger/OpenAPI: https://swagger.io/specification/

---

**Versão da API**: 1.0
**Última atualização**: 2024-01-01

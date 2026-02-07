# Healz API - Guia de Documentação Swagger

## Visão Geral

A API do Healz está completamente documentada usando **@nestjs/swagger** seguindo as melhores práticas da especificação OpenAPI 3.0.

## Acessando a Documentação

### Desenvolvimento
```
http://localhost:3001/api/v1/docs
```

### Produção
```
https://api.healz.com/api/v1/docs
```

## Recursos da Documentação

### 🎯 Features Implementadas

- ✅ **Todos os endpoints documentados** com descrições detalhadas
- ✅ **DTOs completamente anotados** com exemplos e validações
- ✅ **Schemas de requisição e resposta** com exemplos realistas
- ✅ **Autenticação JWT** configurada (Bearer token)
- ✅ **Cookie authentication** para refresh tokens
- ✅ **Rate limiting** documentado em cada endpoint
- ✅ **Códigos de status HTTP** com descrições
- ✅ **Agrupamento por tags** (Authentication, Signup, Invites, etc.)
- ✅ **Exemplos de erro** para cada endpoint
- ✅ **Persistência de token** entre reloads da página

### 📚 Estrutura de Tags

1. **Health** - Health checks
2. **Authentication** - Login, logout, refresh, password reset
3. **Signup** - Criar organizações e usuários
4. **Invites** - Gerenciar convites
5. **Organizations** - Criar clínicas
6. **Clinics** - Adicionar membros

## Como Usar

### 1. Testando Endpoints Públicos

Endpoints como `/health`, `/signup`, `/auth/login` não requerem autenticação.

1. Acesse a documentação
2. Expanda o endpoint desejado
3. Clique em **"Try it out"**
4. Preencha os campos (exemplos já estão preenchidos)
5. Clique em **"Execute"**

### 2. Testando Endpoints Autenticados

#### Passo 1: Fazer Login

1. Expanda `POST /api/v1/auth/login`
2. Clique em **"Try it out"**
3. Use as credenciais de teste ou crie uma conta via `/signup`
4. Clique em **"Execute"**
5. Copie o `accessToken` da resposta

#### Passo 2: Configurar Autenticação

1. Clique no botão **"Authorize"** 🔒 (canto superior direito)
2. Cole o token no campo (NÃO inclua "Bearer ")
3. Clique em **"Authorize"**
4. Feche o modal

#### Passo 3: Testar Endpoints Protegidos

Agora você pode testar qualquer endpoint que requer autenticação. O token será incluído automaticamente.

### 3. Refresh Token

O refresh token é armazenado automaticamente em um cookie httpOnly. Para testar:

1. Faça login via `/auth/login`
2. Use `/auth/refresh` para obter um novo access token
3. O cookie é enviado automaticamente pelo navegador

## Exemplos de Fluxos Completos

### Fluxo 1: Criar Nova Organização

```bash
1. POST /api/v1/signup
   - Cria organização, clínica e usuário admin
   - Retorna accessToken

2. (Automático) Salvar token
   - Use o "Authorize" button com o token recebido

3. POST /api/v1/organizations/{orgId}/clinics
   - Criar clínicas adicionais
```

### Fluxo 2: Convidar Usuário

```bash
1. POST /api/v1/invites
   - Admin envia convite
   - Email é enviado com token

2. POST /api/v1/invites/accept
   - Novo usuário aceita convite com token
   - Define senha
   - Recebe accessToken
```

### Fluxo 3: Trocar Contexto

```bash
1. POST /api/v1/auth/login
   - Login retorna lista de clínicas disponíveis

2. POST /api/v1/auth/switch-context
   - Trocar para outra clínica
   - Recebe novo accessToken com contexto atualizado
```

## Schemas e Validações

### Validações Automáticas

Todos os DTOs possuem validações configuradas usando `class-validator`:

- **Email**: Valida formato de email
- **MinLength**: Valida comprimento mínimo
- **IsUUID**: Valida formato UUID
- **IsEnum**: Valida valores permitidos
- **Matches**: Valida regex (ex: slug)

### Exemplos de Erros de Validação

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

## Rate Limiting

Endpoints sensíveis possuem rate limiting configurado:

| Endpoint | Limite |
|----------|--------|
| `/auth/login` | 5 req/min |
| `/auth/refresh` | 20 req/min |
| `/auth/forgot-password` | 3 req/min |
| `/auth/reset-password` | 5 req/min |
| `/signup` | 3 req/min |
| `/invites` | 10 req/min |
| `/invites/accept` | 5 req/min |

### Resposta de Rate Limit

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

## Autenticação

### JWT Access Token

- **Validade**: 15 minutos
- **Formato**: Bearer token
- **Localização**: Header `Authorization: Bearer <token>`
- **Conteúdo**:
  ```json
  {
    "userId": "uuid",
    "email": "user@example.com",
    "organizationId": "uuid",
    "activeClinicId": "uuid",
    "clinicAccess": [...]
  }
  ```

### Refresh Token

- **Validade**: 7 dias
- **Formato**: String opaca (não é JWT)
- **Localização**: Cookie httpOnly `refreshToken`
- **Rotation**: Token é renovado a cada uso
- **Detecção de Roubo**: Reuso de token revoga toda a família

## Melhores Práticas

### 1. Use os Exemplos

Todos os DTOs possuem exemplos preenchidos. Use-os como referência.

### 2. Leia as Descrições

Cada endpoint possui descrição detalhada do comportamento e requisitos.

### 3. Verifique os Status Codes

Cada endpoint documenta todos os possíveis códigos de resposta:
- `200/201` - Sucesso
- `400` - Validação falhou
- `401` - Não autenticado
- `403` - Sem permissão
- `404` - Não encontrado
- `429` - Rate limit excedido
- `500` - Erro interno

### 4. Persistência de Token

O Swagger está configurado para manter seu token entre reloads. Você não precisa autenticar novamente ao atualizar a página.

### 5. Filtro de Busca

Use o campo de busca no topo para encontrar endpoints rapidamente.

## Configuração Técnica

### Arquivo de Configuração

A configuração do Swagger está em `apps/api/src/main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle("Healz API")
  .setVersion("1.0.0")
  .addBearerAuth()
  .addCookieAuth("refreshToken")
  .build();
```

### Decorators Utilizados

#### Controllers
- `@ApiTags()` - Agrupa endpoints
- `@ApiOperation()` - Descreve operação
- `@ApiResponse()` - Documenta respostas
- `@ApiBearerAuth()` - Requer JWT
- `@ApiBody()` - Documenta body
- `@ApiParam()` - Documenta parâmetros de rota

#### DTOs
- `@ApiProperty()` - Documenta propriedade
  - `description` - Descrição do campo
  - `example` - Exemplo de valor
  - `type` - Tipo do campo
  - `enum` - Valores permitidos
  - `required` - Se é obrigatório
  - `minLength/maxLength` - Validações de tamanho

### Validação Global

Configurada em `main.ts`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

## Exportando a Documentação

### JSON (OpenAPI 3.0)

Acesse: `http://localhost:3001/api/v1/docs-json`

### YAML

Use ferramentas como `swagger-cli` para converter:

```bash
npx swagger-cli bundle http://localhost:3001/api/v1/docs-json -o openapi.yaml -t yaml
```

## Gerando Cliente SDK

Use a especificação OpenAPI para gerar clientes em várias linguagens:

```bash
# TypeScript
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3001/api/v1/docs-json \
  -g typescript-axios \
  -o ./src/api-client

# Python
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3001/api/v1/docs-json \
  -g python \
  -o ./api-client
```

## Troubleshooting

### Token Expirado

Se você receber `401 Unauthorized`:
1. Faça login novamente via `/auth/login`
2. Ou use `/auth/refresh` para renovar o token
3. Atualize o token no botão "Authorize"

### CORS Errors

Se estiver testando de outro domínio:
1. Configure `FRONTEND_URL` no `.env`
2. Reinicie o servidor

### Swagger Não Carrega

1. Verifique se o servidor está rodando
2. Acesse diretamente: `http://localhost:3001/api/v1/docs`
3. Verifique o console do navegador por erros

## Recursos Adicionais

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/docs/open-source-tools/swagger-ui/)

---

**Última atualização**: 2026-02-07
**Versão da API**: 1.0.0

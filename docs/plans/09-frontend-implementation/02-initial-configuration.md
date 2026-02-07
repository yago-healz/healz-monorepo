# 02 - Configuração Inicial

[← Anterior: Visão Geral](./01-overview-and-structure.md) | [Índice](./00-index.md) | [Próximo: Componentes Shadcn/UI →](./03-shadcn-components.md)

---

## 1. Configuração do Axios

### 1.1. Arquivo Principal

**Arquivo:** `src/lib/api/axios.ts`

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { tokenService } from '@/services/token.service'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para cookies httpOnly (refresh token)
})

// Request interceptor - Adiciona access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenService.getAccessToken()

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - Refresh token logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Se erro 401 e não é rota de refresh/login
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Tenta renovar o token
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        tokenService.setAccessToken(data.accessToken)

        // Retry request original
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        }
        return api(originalRequest)

      } catch (refreshError) {
        // Refresh falhou, redireciona para login
        tokenService.clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Tratamento de erros global
    if (error.response) {
      const message = error.response.data?.message || 'Erro ao processar requisição'
      toast.error(message)
    } else if (error.request) {
      toast.error('Erro de conexão com o servidor')
    }

    return Promise.reject(error)
  }
)

export default api
```

### 1.2. Como Funciona o Interceptor

**Request Interceptor:**
1. Captura todas as requisições antes de enviá-las
2. Busca o access token do localStorage
3. Adiciona o token no header `Authorization`

**Response Interceptor:**
1. Captura todas as respostas (sucesso e erro)
2. Se receber 401 (Unauthorized):
   - Tenta renovar o token com `/auth/refresh`
   - Se sucesso: atualiza token e refaz a requisição original
   - Se falha: limpa tokens e redireciona para login
3. Mostra toast de erro automático para falhas

---

## 2. Token Service

### 2.1. Implementação

**Arquivo:** `src/services/token.service.ts`

```typescript
const ACCESS_TOKEN_KEY = 'healz_access_token'
const USER_KEY = 'healz_user'

export const tokenService = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  },

  getUser(): any | null {
    const user = localStorage.getItem(USER_KEY)
    return user ? JSON.parse(user) : null
  },

  setUser(user: any): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  hasValidToken(): boolean {
    return !!this.getAccessToken()
  },
}
```

### 2.2. Métodos Disponíveis

- `getAccessToken()` - Retorna o access token ou null
- `setAccessToken(token)` - Armazena o access token
- `getUser()` - Retorna os dados do usuário
- `setUser(user)` - Armazena dados do usuário
- `clearTokens()` - Remove tokens e dados do usuário
- `hasValidToken()` - Verifica se existe token válido

---

## 3. Endpoints Constants

### 3.1. Arquivo de Endpoints

**Arquivo:** `src/lib/api/endpoints.ts`

```typescript
export const ENDPOINTS = {
  // Health
  HEALTH: '/health',

  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    SWITCH_CONTEXT: '/auth/switch-context',
  },

  // Signup
  SIGNUP: '/signup',

  // Invites
  INVITES: {
    SEND: '/invites',
    ACCEPT: '/invites/accept',
  },

  // Organizations
  ORGANIZATIONS: {
    CLINICS: (orgId: string) => `/organizations/${orgId}/clinics`,
  },

  // Clinics
  CLINICS: {
    MEMBERS: (clinicId: string) => `/clinics/${clinicId}/members`,
  },

  // Platform Admin
  PLATFORM_ADMIN: {
    ORGANIZATIONS: {
      LIST: '/platform-admin/organizations',
      CREATE: '/platform-admin/organizations',
      GET: (id: string) => `/platform-admin/organizations/${id}`,
      UPDATE: (id: string) => `/platform-admin/organizations/${id}`,
      UPDATE_STATUS: (id: string) => `/platform-admin/organizations/${id}/status`,
    },
    CLINICS: {
      LIST: '/platform-admin/clinics',
      CREATE: '/platform-admin/clinics',
      GET: (id: string) => `/platform-admin/clinics/${id}`,
      UPDATE: (id: string) => `/platform-admin/clinics/${id}`,
      TRANSFER: (id: string) => `/platform-admin/clinics/${id}/transfer`,
      UPDATE_STATUS: (id: string) => `/platform-admin/clinics/${id}/status`,
    },
    USERS: {
      LIST: '/platform-admin/users',
      CREATE: '/platform-admin/users',
      GET: (id: string) => `/platform-admin/users/${id}`,
      UPDATE: (id: string) => `/platform-admin/users/${id}`,
      RESET_PASSWORD: (id: string) => `/platform-admin/users/${id}/reset-password`,
      VERIFY_EMAIL: (id: string) => `/platform-admin/users/${id}/verify-email`,
      UPDATE_STATUS: (id: string) => `/platform-admin/users/${id}/status`,
      ADD_TO_CLINIC: (userId: string) => `/platform-admin/users/${userId}/clinics`,
      UPDATE_CLINIC_ROLE: (userId: string, clinicId: string) =>
        `/platform-admin/users/${userId}/clinics/${clinicId}`,
      REMOVE_FROM_CLINIC: (userId: string, clinicId: string) =>
        `/platform-admin/users/${userId}/clinics/${clinicId}`,
      IMPERSONATE: (id: string) => `/platform-admin/users/${id}/impersonate`,
      REVOKE_SESSIONS: (id: string) => `/platform-admin/users/${id}/revoke-sessions`,
    },
    ADMINS: {
      LIST: '/platform-admin/admins',
      CREATE: '/platform-admin/admins',
      REVOKE: (id: string) => `/platform-admin/admins/${id}`,
    },
  },
} as const
```

### 3.2. Como Usar

```typescript
import { ENDPOINTS } from '@/lib/api/endpoints'
import api from '@/lib/api/axios'

// Exemplo 1: Endpoint simples
await api.post(ENDPOINTS.AUTH.LOGIN, { email, password })

// Exemplo 2: Endpoint com parâmetro
await api.get(ENDPOINTS.PLATFORM_ADMIN.ORGANIZATIONS.GET('org-id-123'))

// Exemplo 3: Endpoint com múltiplos parâmetros
await api.patch(
  ENDPOINTS.PLATFORM_ADMIN.USERS.UPDATE_CLINIC_ROLE('user-id', 'clinic-id'),
  { role: 'admin' }
)
```

---

## 4. Types Globais da API

### 4.1. Common Types

**Arquivo:** `src/types/api.types.ts`

```typescript
// === Common Types ===
export type Status = 'active' | 'inactive'
export type Role = 'admin' | 'doctor' | 'secretary'
export type SortOrder = 'asc' | 'desc'

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: SortOrder
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// === User Types ===
export interface User {
  id: string
  email: string
  name: string
  emailVerified: boolean
  activeClinic: ActiveClinic
  availableClinics: AvailableClinic[]
}

export interface ActiveClinic {
  id: string
  name: string
  organizationId: string
  role: Role
}

export interface AvailableClinic {
  clinicId: string
  clinicName: string
  role: Role
}

// === Auth Types ===
export interface LoginDto {
  email: string
  password: string
  clinicId?: string
}

export interface LoginResponse {
  accessToken: string
  user: User
}

export interface SwitchContextDto {
  clinicId: string
}

export interface SwitchContextResponse {
  accessToken: string
}

export interface ForgotPasswordDto {
  email: string
}

export interface ResetPasswordDto {
  token: string
  password: string
}

export interface VerifyEmailDto {
  token: string
}

// === Organization Types ===
export interface Organization {
  id: string
  name: string
  slug: string
  status: Status
  createdAt: string
  clinicsCount?: number
  usersCount?: number
}

export interface CreateOrganizationDto {
  name: string
  slug: string
  initialClinic: {
    name: string
  }
  initialAdmin: {
    name: string
    email: string
    sendInvite: boolean
    password?: string
  }
}

export interface UpdateOrganizationDto {
  name?: string
  slug?: string
}

export interface UpdateOrgStatusDto {
  status: Status
  reason?: string
}

export interface OrganizationListParams extends PaginationParams {
  search?: string
  status?: Status | 'all'
  sortBy?: 'createdAt' | 'name' | 'clinicsCount' | 'usersCount'
}

// === Clinic Types ===
export interface Clinic {
  id: string
  name: string
  organizationId: string
  organizationName?: string
  status: Status
  createdAt: string
}

export interface CreateClinicDto {
  organizationId: string
  name: string
  initialAdminId?: string
}

export interface UpdateClinicDto {
  name?: string
}

export interface TransferClinicDto {
  targetOrganizationId: string
  keepUsers: boolean
}

export interface UpdateClinicStatusDto {
  status: Status
  reason?: string
}

export interface ClinicListParams extends PaginationParams {
  search?: string
  organizationId?: string
  status?: Status | 'all'
  sortBy?: 'createdAt' | 'name'
}

// === User Management Types ===
export interface PlatformUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  status: Status
  createdAt: string
  clinics: UserClinic[]
}

export interface UserClinic {
  clinicId: string
  clinicName: string
  organizationId: string
  organizationName: string
  role: Role
}

export interface CreateUserDto {
  name: string
  email: string
  clinicId: string
  role: Role
  sendInvite: boolean
  password?: string
}

export interface UpdateUserDto {
  name?: string
  email?: string
}

export interface UpdateUserStatusDto {
  status: Status
  reason?: string
  revokeTokens: boolean
}

export interface AddUserClinicDto {
  clinicId: string
  role: Role
}

export interface UpdateUserClinicDto {
  role: Role
}

export interface UserListParams extends PaginationParams {
  search?: string
  organizationId?: string
  clinicId?: string
  role?: Role
  emailVerified?: 'true' | 'false' | 'all'
  status?: Status | 'all'
  sortBy?: 'createdAt' | 'name' | 'email'
}

// === Invite Types ===
export interface SendInviteDto {
  email: string
  name: string
  clinicId: string
  role: Role
}

export interface AcceptInviteDto {
  token: string
  password: string
}

// === Platform Admin Types ===
export interface PlatformAdmin {
  id: string
  userId: string
  userName: string
  userEmail: string
  createdAt: string
}

export interface CreatePlatformAdminDto {
  userId: string
}
```

---

## 5. Variáveis de Ambiente

### 5.1. Arquivo `.env.local`

Criar arquivo `.env.local` na raiz do projeto:

```bash
VITE_API_URL=http://localhost:3001/api/v1
```

### 5.2. Uso no Código

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'
```

### 5.3. Diferentes Ambientes

**Desenvolvimento:**
```bash
VITE_API_URL=http://localhost:3001/api/v1
```

**Produção:**
```bash
VITE_API_URL=https://api.healz.com/api/v1
```

---

## 6. Checklist de Configuração

### Fase 1.1-1.5: Configuração Base

- [ ] Criar `src/lib/api/axios.ts` com interceptors
- [ ] Criar `src/services/token.service.ts`
- [ ] Criar `src/lib/api/endpoints.ts`
- [ ] Criar `src/types/api.types.ts`
- [ ] Criar `.env.local` com `VITE_API_URL`
- [ ] Testar conexão básica com a API

### Testes de Validação

```typescript
// Teste 1: Verificar se axios está configurado
import api from '@/lib/api/axios'
console.log(api.defaults.baseURL) // Deve mostrar URL da API

// Teste 2: Verificar tokenService
import { tokenService } from '@/services/token.service'
tokenService.setAccessToken('test-token')
console.log(tokenService.getAccessToken()) // Deve retornar 'test-token'
tokenService.clearTokens()

// Teste 3: Verificar endpoints
import { ENDPOINTS } from '@/lib/api/endpoints'
console.log(ENDPOINTS.AUTH.LOGIN) // Deve mostrar '/auth/login'
console.log(ENDPOINTS.PLATFORM_ADMIN.USERS.GET('123')) // '/platform-admin/users/123'
```

---

## 7. Próximos Passos

Após concluir a configuração inicial:

1. Instalar componentes Shadcn/UI adicionais ([03 - Componentes](./03-shadcn-components.md))
2. Implementar queries e mutations de Auth ([04 - Auth Queries](./04-queries-mutations-auth-orgs.md))
3. Criar tela de login ([06 - Login](./06-login-implementation.md))

---

[← Anterior: Visão Geral](./01-overview-and-structure.md) | [Índice](./00-index.md) | [Próximo: Componentes Shadcn/UI →](./03-shadcn-components.md)

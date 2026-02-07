# Plano de Implementação - Frontend Healz

**Status:** Proposta
**Data:** 2026-02-07
**Versão:** 1.0

## Índice
- [1. Visão Geral](#1-visão-geral)
- [2. Estrutura do Projeto](#2-estrutura-do-projeto)
- [3. Configuração Inicial](#3-configuração-inicial)
- [4. Componentes Shadcn/UI](#4-componentes-shadcnui)
- [5. Queries e Mutations](#5-queries-e-mutations)
- [6. Implementação da Tela de Login](#6-implementação-da-tela-de-login)
- [7. Implementação do Dashboard Admin](#7-implementação-do-dashboard-admin)
- [8. Cronograma de Implementação](#8-cronograma-de-implementação)

---

## 1. Visão Geral

Este documento detalha o plano de implementação do frontend da plataforma Healz, incluindo:

- **Reestruturação** da organização de pastas seguindo padrões de feature-based architecture
- **Configuração** de bibliotecas e ferramentas (Tanstack Router, Tanstack Query, Shadcn/UI)
- **Implementação** de autenticação completa (login, logout, refresh token, switch context)
- **Criação** do dashboard do painel administrativo da plataforma
- **Integração** completa com a API backend (http://localhost:3001/api/v1)

### 1.1. Stack Tecnológica

- **React 18** - Biblioteca UI
- **TypeScript 5** - Tipagem estática
- **Vite 6** - Build tool e dev server
- **Tanstack Router** - Roteamento file-based com type-safety
- **Tanstack Query v5** - State management assíncrono e cache
- **Tailwind CSS v4** - Estilização utilitária
- **Shadcn/UI** - Sistema de componentes
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas

### 1.2. Estado Atual

**Existente:**
- ✅ Configuração básica do Vite e TypeScript
- ✅ Tanstack Router e Query configurados
- ✅ ~60 componentes Shadcn/UI já instalados
- ✅ Fluxo de onboarding (páginas estáticas)
- ✅ Estrutura parcial de pastas

**A Implementar:**
- ❌ Estrutura de pastas completa seguindo feature-based architecture
- ❌ Configuração de axios com interceptors
- ❌ Sistema de autenticação (login, tokens, guards)
- ❌ Dashboard do painel admin
- ❌ Tipos TypeScript gerados a partir da API
- ❌ Queries e mutations para toda a API

---

## 2. Estrutura do Projeto

### 2.1. Arquitetura de Pastas

```
src/
├── components/              # Componentes reutilizáveis globais
│   ├── ui/                 # Componentes base do Shadcn/UI (60+ existentes)
│   └── layout/             # Componentes de layout (Header, Footer, etc)
│       ├── app-header.tsx
│       ├── app-footer.tsx
│       └── app-shell.tsx
│
├── features/               # Funcionalidades por domínio
│   ├── auth/              # Feature: Autenticação
│   │   ├── components/    # Componentes específicos de auth
│   │   │   ├── login-form.tsx
│   │   │   ├── forgot-password-form.tsx
│   │   │   └── reset-password-form.tsx
│   │   ├── hooks/         # Hooks específicos de auth
│   │   │   ├── use-auth.ts
│   │   │   └── use-session.ts
│   │   ├── api/           # Queries e mutations de auth
│   │   │   ├── queries.ts
│   │   │   └── mutations.ts
│   │   └── types.ts       # Types específicos de auth
│   │
│   ├── platform-admin/    # Feature: Painel Admin da Plataforma
│   │   ├── components/
│   │   │   ├── organizations/
│   │   │   │   ├── organizations-table.tsx
│   │   │   │   ├── organization-form.tsx
│   │   │   │   └── organization-details.tsx
│   │   │   ├── clinics/
│   │   │   │   ├── clinics-table.tsx
│   │   │   │   ├── clinic-form.tsx
│   │   │   │   └── clinic-details.tsx
│   │   │   ├── users/
│   │   │   │   ├── users-table.tsx
│   │   │   │   ├── user-form.tsx
│   │   │   │   └── user-details.tsx
│   │   │   └── dashboard/
│   │   │       ├── stats-cards.tsx
│   │   │       └── recent-activity.tsx
│   │   ├── hooks/
│   │   │   └── use-platform-admin.ts
│   │   ├── api/
│   │   │   ├── organizations-api.ts
│   │   │   ├── clinics-api.ts
│   │   │   └── users-api.ts
│   │   └── types.ts
│   │
│   ├── organizations/      # Feature: Gerenciamento de Organizações
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types.ts
│   │
│   └── invites/           # Feature: Convites
│       ├── components/
│       ├── hooks/
│       ├── api/
│       └── types.ts
│
├── hooks/                  # Hooks compartilhados
│   ├── use-toast.ts       # ✅ Existente
│   ├── use-mobile.tsx     # ✅ Existente
│   ├── use-auth-guard.ts  # Guard para rotas autenticadas
│   ├── use-debounce.ts    # Debounce de valores
│   └── use-pagination.ts  # Lógica de paginação
│
├── lib/                    # Configurações de libs externas
│   ├── api/               # Configuração de APIs
│   │   ├── axios.ts       # Cliente axios com interceptors
│   │   ├── api-client.ts  # Wrapper da API
│   │   └── endpoints.ts   # Constantes de endpoints
│   ├── queryClient.ts     # ✅ Existente - Configuração Tanstack Query
│   ├── router.ts          # ✅ Existente - Configuração Tanstack Router
│   └── utils.ts           # Funções utilitárias
│
├── services/               # Serviços e APIs genéricos
│   ├── storage.service.ts # LocalStorage/SessionStorage
│   ├── auth.service.ts    # Serviço de autenticação
│   └── token.service.ts   # Gerenciamento de tokens
│
├── types/                  # Types globais
│   ├── api.types.ts       # Types da API
│   ├── auth.types.ts      # Types de autenticação
│   ├── common.types.ts    # Types comuns
│   └── index.ts           # Re-exports
│
├── utils/                  # Funções utilitárias
│   ├── format.ts          # Formatação (datas, números, etc)
│   ├── validation.ts      # Validações customizadas
│   └── cn.ts              # ✅ Existente - class-merge utility
│
├── routes/                 # Rotas do Tanstack Router
│   ├── __root.tsx         # ✅ Existente - Layout raiz
│   ├── index.tsx          # ✅ Existente - Home
│   │
│   ├── _public/           # Rotas públicas (sem autenticação)
│   │   ├── login.tsx
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   ├── verify-email.tsx
│   │   ├── accept-invite.tsx
│   │   └── onboarding/    # ✅ Existente - Fluxo de onboarding
│   │
│   └── _authenticated/    # Rotas autenticadas (requer login)
│       ├── _layout.tsx    # Layout com sidebar e header
│       │
│       ├── platform-admin/         # Painel Admin da Plataforma
│       │   ├── index.tsx           # Dashboard overview
│       │   ├── organizations/
│       │   │   ├── index.tsx       # Lista de organizações
│       │   │   ├── $id.tsx         # Detalhes da organização
│       │   │   └── new.tsx         # Criar organização
│       │   ├── clinics/
│       │   │   ├── index.tsx       # Lista de clínicas
│       │   │   ├── $id.tsx         # Detalhes da clínica
│       │   │   └── new.tsx         # Criar clínica
│       │   └── users/
│       │       ├── index.tsx       # Lista de usuários
│       │       ├── $id.tsx         # Detalhes do usuário
│       │       └── new.tsx         # Criar usuário
│       │
│       └── settings/
│           └── profile.tsx
│
├── assets/                 # Assets estáticos
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── App.tsx                 # Componente raiz
├── main.tsx               # ✅ Existente - Entry point
└── index.css              # Estilos globais + Tailwind
```

### 2.2. Convenções de Nomenclatura

- **Arquivos de componentes:** `kebab-case.tsx` (ex: `login-form.tsx`)
- **Componentes React:** `PascalCase` (ex: `LoginForm`)
- **Hooks:** `use-kebab-case.ts` (ex: `use-auth.ts`)
- **Types/Interfaces:** `PascalCase` com sufixo quando necessário (ex: `User`, `LoginDto`)
- **Constantes:** `UPPER_SNAKE_CASE` (ex: `API_BASE_URL`)
- **Funções utilitárias:** `camelCase` (ex: `formatDate`)

---

## 3. Configuração Inicial

### 3.1. Configuração do Axios

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

### 3.2. Configuração do Token Service

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

### 3.3. Configuração de Endpoints

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

### 3.4. Types Globais da API

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

## 4. Componentes Shadcn/UI

### 4.1. Componentes Já Instalados

O projeto já possui ~60 componentes Shadcn/UI instalados em `src/components/ui/`:

- ✅ accordion, alert, alert-dialog, avatar
- ✅ breadcrumb, button, card, carousel, checkbox
- ✅ dialog, drawer, dropdown-menu
- ✅ form, field, input, input-group, label
- ✅ popover, progress, radio-group
- ✅ scroll-area, select, separator, sheet, sidebar
- ✅ table, tabs, toast, toaster, tooltip
- ✅ E muitos outros...

### 4.2. Componentes Adicionais Necessários

Componentes que precisam ser instalados:

```bash
# Badge - Para status indicators
npx shadcn@latest add badge

# Calendar - Para date pickers
npx shadcn@latest add calendar

# Command - Para search/command palette
npx shadcn@latest add command

# Data table - Para tabelas avançadas
npx shadcn@latest add data-table

# Skeleton - Para loading states
npx shadcn@latest add skeleton

# Switch - Para toggles
npx shadcn@latest add switch
```

### 4.3. Blocks do Shadcn/UI a Utilizar

**Login Page Block:**
- Usar o block de autenticação com Card
- Componentes: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Label, Button

**Dashboard Sidebar Block:**
- Usar o block de Sidebar com navegação colapsável
- Componentes: Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem

**Data Tables:**
- Usar o block de DataTable com paginação
- Componentes: Table, TableHeader, TableBody, TableRow, TableCell, DataTablePagination

---

## 5. Queries e Mutations

### 5.1. Auth Feature - Queries e Mutations

**Arquivo:** `src/features/auth/api/mutations.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { tokenService } from '@/services/token.service'
import type { LoginDto, LoginResponse, SwitchContextDto, ForgotPasswordDto, ResetPasswordDto } from '@/types/api.types'

// Login mutation
export const useLoginMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: LoginDto): Promise<LoginResponse> => {
      const response = await api.post(ENDPOINTS.AUTH.LOGIN, data)
      return response.data
    },
    onSuccess: (data) => {
      tokenService.setAccessToken(data.accessToken)
      tokenService.setUser(data.user)
      queryClient.setQueryData(['auth', 'user'], data.user)
      toast.success('Login realizado com sucesso!')
    },
    onError: () => {
      toast.error('Credenciais inválidas')
    },
  })
}

// Logout mutation
export const useLogoutMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.post(ENDPOINTS.AUTH.LOGOUT)
    },
    onSuccess: () => {
      tokenService.clearTokens()
      queryClient.clear()
      window.location.href = '/login'
    },
  })
}

// Switch context mutation
export const useSwitchContextMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SwitchContextDto) => {
      const response = await api.post(ENDPOINTS.AUTH.SWITCH_CONTEXT, data)
      return response.data
    },
    onSuccess: (data) => {
      tokenService.setAccessToken(data.accessToken)
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
      toast.success('Contexto alterado com sucesso!')
    },
  })
}

// Forgot password mutation
export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: async (data: ForgotPasswordDto) => {
      const response = await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Email de recuperação enviado!')
    },
  })
}

// Reset password mutation
export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: async (data: ResetPasswordDto) => {
      const response = await api.post(ENDPOINTS.AUTH.RESET_PASSWORD, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!')
    },
  })
}

// Verify email mutation
export const useVerifyEmailMutation = () => {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post(ENDPOINTS.AUTH.VERIFY_EMAIL, { token })
      return response.data
    },
    onSuccess: () => {
      toast.success('Email verificado com sucesso!')
    },
  })
}

// Resend verification mutation
export const useResendVerificationMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post(ENDPOINTS.AUTH.RESEND_VERIFICATION)
      return response.data
    },
    onSuccess: () => {
      toast.success('Email de verificação reenviado!')
    },
  })
}
```

**Arquivo:** `src/features/auth/api/queries.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { tokenService } from '@/services/token.service'
import type { User } from '@/types/api.types'

// Get current user from token
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: () => {
      const user = tokenService.getUser()
      if (!user) throw new Error('No user found')
      return user as User
    },
    enabled: tokenService.hasValidToken(),
    staleTime: Infinity, // User data doesn't change unless we update it
  })
}

// Check if user is authenticated
export const useIsAuthenticated = () => {
  const { data: user } = useCurrentUser()
  return !!user && tokenService.hasValidToken()
}
```

### 5.2. Platform Admin - Organizations

**Arquivo:** `src/features/platform-admin/api/organizations-api.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type {
  Organization,
  OrganizationListParams,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  UpdateOrgStatusDto,
  PaginatedResponse,
} from '@/types/api.types'

// List organizations
export const useOrganizations = (params: OrganizationListParams) => {
  return useQuery({
    queryKey: ['platform-admin', 'organizations', params],
    queryFn: async (): Promise<PaginatedResponse<Organization>> => {
      const response = await api.get(ENDPOINTS.PLATFORM_ADMIN.ORGANIZATIONS.LIST, { params })
      return response.data
    },
  })
}

// Get organization by ID
export const useOrganization = (id: string) => {
  return useQuery({
    queryKey: ['platform-admin', 'organizations', id],
    queryFn: async () => {
      const response = await api.get(ENDPOINTS.PLATFORM_ADMIN.ORGANIZATIONS.GET(id))
      return response.data
    },
    enabled: !!id,
  })
}

// Create organization
export const useCreateOrganization = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateOrganizationDto) => {
      const response = await api.post(ENDPOINTS.PLATFORM_ADMIN.ORGANIZATIONS.CREATE, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'organizations'] })
      toast.success('Organização criada com sucesso!')
    },
  })
}

// Update organization
export const useUpdateOrganization = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOrganizationDto }) => {
      const response = await api.patch(ENDPOINTS.PLATFORM_ADMIN.ORGANIZATIONS.UPDATE(id), data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'organizations'] })
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'organizations', variables.id] })
      toast.success('Organização atualizada com sucesso!')
    },
  })
}

// Update organization status
export const useUpdateOrganizationStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOrgStatusDto }) => {
      const response = await api.patch(ENDPOINTS.PLATFORM_ADMIN.ORGANIZATIONS.UPDATE_STATUS(id), data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'organizations'] })
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'organizations', variables.id] })
      toast.success('Status atualizado com sucesso!')
    },
  })
}
```

### 5.3. Platform Admin - Clinics

**Arquivo:** `src/features/platform-admin/api/clinics-api.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type {
  Clinic,
  ClinicListParams,
  CreateClinicDto,
  UpdateClinicDto,
  TransferClinicDto,
  UpdateClinicStatusDto,
  PaginatedResponse,
} from '@/types/api.types'

// List clinics
export const useClinics = (params: ClinicListParams) => {
  return useQuery({
    queryKey: ['platform-admin', 'clinics', params],
    queryFn: async (): Promise<PaginatedResponse<Clinic>> => {
      const response = await api.get(ENDPOINTS.PLATFORM_ADMIN.CLINICS.LIST, { params })
      return response.data
    },
  })
}

// Get clinic by ID
export const useClinic = (id: string) => {
  return useQuery({
    queryKey: ['platform-admin', 'clinics', id],
    queryFn: async () => {
      const response = await api.get(ENDPOINTS.PLATFORM_ADMIN.CLINICS.GET(id))
      return response.data
    },
    enabled: !!id,
  })
}

// Create clinic
export const useCreateClinic = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateClinicDto) => {
      const response = await api.post(ENDPOINTS.PLATFORM_ADMIN.CLINICS.CREATE, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'clinics'] })
      toast.success('Clínica criada com sucesso!')
    },
  })
}

// Update clinic
export const useUpdateClinic = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateClinicDto }) => {
      const response = await api.patch(ENDPOINTS.PLATFORM_ADMIN.CLINICS.UPDATE(id), data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'clinics'] })
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'clinics', variables.id] })
      toast.success('Clínica atualizada com sucesso!')
    },
  })
}

// Transfer clinic
export const useTransferClinic = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TransferClinicDto }) => {
      const response = await api.patch(ENDPOINTS.PLATFORM_ADMIN.CLINICS.TRANSFER(id), data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'clinics'] })
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'organizations'] })
      toast.success('Clínica transferida com sucesso!')
    },
  })
}

// Update clinic status
export const useUpdateClinicStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateClinicStatusDto }) => {
      const response = await api.patch(ENDPOINTS.PLATFORM_ADMIN.CLINICS.UPDATE_STATUS(id), data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'clinics'] })
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'clinics', variables.id] })
      toast.success('Status atualizado com sucesso!')
    },
  })
}
```

### 5.4. Platform Admin - Users

**Arquivo:** `src/features/platform-admin/api/users-api.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type {
  PlatformUser,
  UserListParams,
  CreateUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  AddUserClinicDto,
  UpdateUserClinicDto,
  PaginatedResponse,
} from '@/types/api.types'

// List users
export const useUsers = (params: UserListParams) => {
  return useQuery({
    queryKey: ['platform-admin', 'users', params],
    queryFn: async (): Promise<PaginatedResponse<PlatformUser>> => {
      const response = await api.get(ENDPOINTS.PLATFORM_ADMIN.USERS.LIST, { params })
      return response.data
    },
  })
}

// Get user by ID
export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['platform-admin', 'users', id],
    queryFn: async () => {
      const response = await api.get(ENDPOINTS.PLATFORM_ADMIN.USERS.GET(id))
      return response.data
    },
    enabled: !!id,
  })
}

// Create user
export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      const response = await api.post(ENDPOINTS.PLATFORM_ADMIN.USERS.CREATE, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'users'] })
      toast.success('Usuário criado com sucesso!')
    },
  })
}

// Update user
export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserDto }) => {
      const response = await api.patch(ENDPOINTS.PLATFORM_ADMIN.USERS.UPDATE(id), data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'users', variables.id] })
      toast.success('Usuário atualizado com sucesso!')
    },
  })
}

// Update user status
export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserStatusDto }) => {
      const response = await api.patch(ENDPOINTS.PLATFORM_ADMIN.USERS.UPDATE_STATUS(id), data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'users', variables.id] })
      toast.success('Status atualizado com sucesso!')
    },
  })
}

// Add user to clinic
export const useAddUserToClinic = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: AddUserClinicDto }) => {
      const response = await api.post(ENDPOINTS.PLATFORM_ADMIN.USERS.ADD_TO_CLINIC(userId), data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'users', variables.userId] })
      toast.success('Usuário adicionado à clínica com sucesso!')
    },
  })
}

// Update user clinic role
export const useUpdateUserClinicRole = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      clinicId,
      data
    }: {
      userId: string
      clinicId: string
      data: UpdateUserClinicDto
    }) => {
      const response = await api.patch(
        ENDPOINTS.PLATFORM_ADMIN.USERS.UPDATE_CLINIC_ROLE(userId, clinicId),
        data
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'users', variables.userId] })
      toast.success('Role atualizado com sucesso!')
    },
  })
}

// Remove user from clinic
export const useRemoveUserFromClinic = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, clinicId }: { userId: string; clinicId: string }) => {
      const response = await api.delete(
        ENDPOINTS.PLATFORM_ADMIN.USERS.REMOVE_FROM_CLINIC(userId, clinicId)
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'users', variables.userId] })
      toast.success('Usuário removido da clínica com sucesso!')
    },
  })
}

// Impersonate user
export const useImpersonateUser = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(ENDPOINTS.PLATFORM_ADMIN.USERS.IMPERSONATE(id))
      return response.data
    },
    onSuccess: (data) => {
      tokenService.setAccessToken(data.accessToken)
      window.location.href = '/dashboard'
      toast.success('Agora você está logado como este usuário')
    },
  })
}

// Revoke user sessions
export const useRevokeUserSessions = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(ENDPOINTS.PLATFORM_ADMIN.USERS.REVOKE_SESSIONS(id))
      return response.data
    },
    onSuccess: () => {
      toast.success('Sessões revogadas com sucesso!')
    },
  })
}

// Reset user password
export const useResetUserPassword = () => {
  return useMutation({
    mutationFn: async ({ id, sendEmail }: { id: string; sendEmail: boolean }) => {
      const response = await api.post(
        ENDPOINTS.PLATFORM_ADMIN.USERS.RESET_PASSWORD(id),
        { sendEmail }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success('Senha resetada com sucesso!')
    },
  })
}

// Verify user email
export const useVerifyUserEmail = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(ENDPOINTS.PLATFORM_ADMIN.USERS.VERIFY_EMAIL(id))
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'users', id] })
      toast.success('Email verificado com sucesso!')
    },
  })
}
```

---

## 6. Implementação da Tela de Login

### 6.1. Componente de Login

**Arquivo:** `src/features/auth/components/login-form.tsx`

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLoginMutation } from '../api/mutations'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const loginMutation = useLoginMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    await loginMutation.mutateAsync(data)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          Entre com seu email e senha para acessar a plataforma
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Não tem uma conta?{' '}
          <Link to="/signup" className="text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
```

### 6.2. Rota de Login

**Arquivo:** `src/routes/_public/login.tsx`

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginForm } from '@/features/auth/components/login-form'
import { tokenService } from '@/services/token.service'

export const Route = createFileRoute('/_public/login')({
  // Redirect if already authenticated
  beforeLoad: () => {
    if (tokenService.hasValidToken()) {
      throw redirect({ to: '/platform-admin' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <LoginForm />
    </div>
  )
}
```

### 6.3. Layout Público

**Arquivo:** `src/routes/_public.tsx`

```typescript
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { tokenService } from '@/services/token.service'

export const Route = createFileRoute('/_public')({
  beforeLoad: () => {
    // Redirect to dashboard if already authenticated
    if (tokenService.hasValidToken()) {
      throw redirect({ to: '/platform-admin' })
    }
  },
  component: PublicLayout,
})

function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  )
}
```

---

## 7. Implementação do Dashboard Admin

### 7.1. Layout Autenticado com Sidebar

**Arquivo:** `src/routes/_authenticated/_layout.tsx`

```typescript
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { tokenService } from '@/services/token.service'

export const Route = createFileRoute('/_authenticated/_layout')({
  beforeLoad: () => {
    if (!tokenService.hasValidToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
```

### 7.2. Sidebar Component

**Arquivo:** `src/components/layout/app-sidebar.tsx`

```typescript
import { Link } from '@tanstack/react-router'
import {
  Building2,
  Hospital,
  Users,
  LayoutDashboard,
  Settings,
  Shield,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useCurrentUser } from '@/features/auth/api/queries'
import { UserNav } from './user-nav'

const navigation = [
  {
    title: 'Platform Admin',
    items: [
      {
        title: 'Dashboard',
        icon: LayoutDashboard,
        href: '/platform-admin',
      },
      {
        title: 'Organizações',
        icon: Building2,
        href: '/platform-admin/organizations',
      },
      {
        title: 'Clínicas',
        icon: Hospital,
        href: '/platform-admin/clinics',
      },
      {
        title: 'Usuários',
        icon: Users,
        href: '/platform-admin/users',
      },
      {
        title: 'Admins',
        icon: Shield,
        href: '/platform-admin/admins',
      },
    ],
  },
  {
    title: 'Configurações',
    items: [
      {
        title: 'Perfil',
        icon: Settings,
        href: '/settings/profile',
      },
    ],
  },
]

export function AppSidebar() {
  const { data: user } = useCurrentUser()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Hospital className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Healz</span>
            <span className="truncate text-xs">Platform Admin</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <Link to={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {user && <UserNav user={user} />}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
```

### 7.3. Dashboard Overview

**Arquivo:** `src/routes/_authenticated/platform-admin/index.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Hospital, Users, Activity } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/platform-admin/')({
  component: PlatformAdminDashboard,
})

function PlatformAdminDashboard() {
  // TODO: Fetch real stats
  const stats = [
    {
      title: 'Organizações',
      value: '24',
      icon: Building2,
      description: '+2 este mês',
    },
    {
      title: 'Clínicas',
      value: '156',
      icon: Hospital,
      description: '+12 este mês',
    },
    {
      title: 'Usuários',
      value: '1,429',
      icon: Users,
      description: '+89 este mês',
    },
    {
      title: 'Ativas',
      value: '98%',
      icon: Activity,
      description: 'Taxa de ativação',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral da plataforma Healz
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TODO: Add charts and recent activity */}
    </div>
  )
}
```

### 7.4. Organizations Table

**Arquivo:** `src/features/platform-admin/components/organizations/organizations-table.tsx`

```typescript
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, Edit, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useOrganizations } from '../../api/organizations-api'
import type { Organization } from '@/types/api.types'

export function OrganizationsTable() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useOrganizations({
    page,
    limit: 20,
    search,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  if (isLoading) {
    return <div>Carregando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar organizações..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button asChild>
          <Link to="/platform-admin/organizations/new">
            Nova Organização
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Clínicas</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((org: Organization) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>{org.slug}</TableCell>
                <TableCell>{org.clinicsCount || 0}</TableCell>
                <TableCell>{org.usersCount || 0}</TableCell>
                <TableCell>
                  <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                    {org.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(org.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to={`/platform-admin/organizations/${org.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* TODO: Add pagination component */}
    </div>
  )
}
```

### 7.5. Organizations Page

**Arquivo:** `src/routes/_authenticated/platform-admin/organizations/index.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { OrganizationsTable } from '@/features/platform-admin/components/organizations/organizations-table'

export const Route = createFileRoute('/_authenticated/platform-admin/organizations/')({
  component: OrganizationsPage,
})

function OrganizationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organizações</h1>
        <p className="text-muted-foreground">
          Gerencie todas as organizações da plataforma
        </p>
      </div>

      <OrganizationsTable />
    </div>
  )
}
```

---

## 8. Cronograma de Implementação

### Fase 1: Configuração Base (1-2 dias)

- [ ] **1.1** Criar estrutura de pastas completa
- [ ] **1.2** Configurar axios com interceptors
- [ ] **1.3** Implementar token service
- [ ] **1.4** Criar types globais da API
- [ ] **1.5** Configurar endpoints constants
- [ ] **1.6** Instalar componentes Shadcn/UI adicionais (badge, calendar, command, skeleton, switch)

### Fase 2: Autenticação (2-3 dias)

- [ ] **2.1** Implementar queries e mutations de auth
- [ ] **2.2** Criar hook useAuth
- [ ] **2.3** Implementar componente LoginForm
- [ ] **2.4** Criar página de login
- [ ] **2.5** Implementar forgot password flow
- [ ] **2.6** Implementar reset password flow
- [ ] **2.7** Implementar verify email flow
- [ ] **2.8** Criar guards de autenticação para rotas
- [ ] **2.9** Testar fluxo completo de autenticação

### Fase 3: Layout e Navegação (1-2 dias)

- [ ] **3.1** Implementar AppSidebar com navegação
- [ ] **3.2** Criar AppHeader com user menu
- [ ] **3.3** Implementar layout autenticado
- [ ] **3.4** Configurar rotas protegidas
- [ ] **3.5** Implementar switch context (trocar clínica)
- [ ] **3.6** Testar navegação e responsividade

### Fase 4: Dashboard Admin - Organizations (2-3 dias)

- [ ] **4.1** Implementar queries/mutations de organizations
- [ ] **4.2** Criar OrganizationsTable com filtros e paginação
- [ ] **4.3** Implementar OrganizationForm (criar/editar)
- [ ] **4.4** Criar página de detalhes da organização
- [ ] **4.5** Implementar ações (ativar/desativar, editar status)
- [ ] **4.6** Testar CRUD completo de organizações

### Fase 5: Dashboard Admin - Clinics (2-3 dias)

- [ ] **5.1** Implementar queries/mutations de clinics
- [ ] **5.2** Criar ClinicsTable com filtros e paginação
- [ ] **5.3** Implementar ClinicForm (criar/editar)
- [ ] **5.4** Criar página de detalhes da clínica
- [ ] **5.5** Implementar transfer clinic
- [ ] **5.6** Implementar ações (ativar/desativar)
- [ ] **5.7** Testar CRUD completo de clínicas

### Fase 6: Dashboard Admin - Users (2-3 dias)

- [ ] **6.1** Implementar queries/mutations de users
- [ ] **6.2** Criar UsersTable com filtros avançados
- [ ] **6.3** Implementar UserForm (criar/editar)
- [ ] **6.4** Criar página de detalhes do usuário
- [ ] **6.5** Implementar gerenciamento de clínicas do usuário
- [ ] **6.6** Implementar ações (reset password, verify email, impersonate)
- [ ] **6.7** Testar CRUD completo de usuários

### Fase 7: Dashboard Admin - Overview (1 dia)

- [ ] **7.1** Implementar stats cards do dashboard
- [ ] **7.2** Criar gráficos de atividade (opcional)
- [ ] **7.3** Implementar lista de atividades recentes
- [ ] **7.4** Testar dashboard overview

### Fase 8: Refinamentos e Testes (1-2 dias)

- [ ] **8.1** Implementar loading states em todas as páginas
- [ ] **8.2** Implementar error boundaries
- [ ] **8.3** Adicionar skeleton loaders
- [ ] **8.4** Melhorar mensagens de erro e toast
- [ ] **8.5** Testar responsividade em todas as telas
- [ ] **8.6** Revisar acessibilidade (a11y)
- [ ] **8.7** Otimizar performance (code splitting, lazy loading)
- [ ] **8.8** Testes de integração end-to-end

### Estimativa Total: 12-19 dias

---

## 9. Notas Técnicas Importantes

### 9.1. Refresh Token Strategy

A API implementa **refresh token rotation** para segurança. O frontend deve:

1. Armazenar apenas o access token no localStorage
2. O refresh token é armazenado em cookie httpOnly (gerenciado automaticamente)
3. Quando o access token expira (401), fazer request para `/auth/refresh`
4. Se o refresh falhar, limpar tokens e redirecionar para login

### 9.2. Multi-tenancy e Context Switching

- Usuário pode ter acesso a múltiplas clínicas
- A clínica ativa está no token JWT
- Para trocar de clínica: `POST /auth/switch-context`
- Isso gera um novo access token com contexto atualizado

### 9.3. Tanstack Query Best Practices

- Usar query keys hierárquicas: `['platform-admin', 'organizations', params]`
- Invalidar queries após mutations com `queryClient.invalidateQueries()`
- Usar `enabled` em queries condicionais
- Configurar `staleTime` e `gcTime` apropriadamente

### 9.4. Tanstack Router Type Safety

- Usar `createFileRoute` para type-safe routes
- Implementar `beforeLoad` para auth guards e redirects
- Usar `search` params para filtros de tabelas
- Aproveitar o file-based routing para organização

### 9.5. Shadcn/UI Customization

- Componentes são copiados para o projeto (não importados de npm)
- Podem ser customizados livremente em `src/components/ui/`
- Usar o CLI para adicionar novos componentes: `npx shadcn@latest add <component>`
- Seguir blocks/examples da documentação oficial

---

## 10. Próximos Passos

Após concluir este plano, os próximos passos incluem:

1. **Implementar módulo de Invites** (feature completa)
2. **Criar módulo de gerenciamento de clínicas** (feature para org admins)
3. **Implementar dashboard de clínica** (para doctors/secretaries)
4. **Adicionar módulo de pacientes**
5. **Implementar agendamentos**
6. **Criar sistema de prontuários**

---

## Apêndices

### A. Variáveis de Ambiente

Criar arquivo `.env.local`:

```bash
VITE_API_URL=http://localhost:3001/api/v1
```

### B. Scripts Úteis

Adicionar ao `package.json`:

```json
{
  "scripts": {
    "dev": "vite --port 3000",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  }
}
```

### C. Referências

- [Tanstack Router](https://tanstack.com/router)
- [Tanstack Query](https://tanstack.com/query)
- [Shadcn/UI](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev)

---

**Fim do Documento**

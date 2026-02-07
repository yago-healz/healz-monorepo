# 04 - Queries e Mutations - Auth & Organizations

[← Anterior: Componentes](./03-shadcn-components.md) | [Índice](./00-index.md) | [Próximo: Clinics & Users →](./05-queries-mutations-clinics-users.md)

---

## 1. Auth Feature - Mutations

### 1.1. Arquivo de Mutations

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

### 1.2. Como Usar as Mutations

```typescript
// Exemplo: Login
import { useLoginMutation } from '@/features/auth/api/mutations'

function LoginForm() {
  const loginMutation = useLoginMutation()

  const handleSubmit = async (data: LoginDto) => {
    try {
      await loginMutation.mutateAsync(data)
      // Redirecionar após sucesso
      navigate('/platform-admin')
    } catch (error) {
      // Erro já tratado pela mutation
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button disabled={loginMutation.isPending}>
        {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
```

---

## 2. Auth Feature - Queries

### 2.1. Arquivo de Queries

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

### 2.2. Hook useAuth Customizado

**Arquivo:** `src/features/auth/hooks/use-auth.ts`

```typescript
import { useCurrentUser } from '../api/queries'
import { useLoginMutation, useLogoutMutation, useSwitchContextMutation } from '../api/mutations'
import { tokenService } from '@/services/token.service'

export function useAuth() {
  const { data: user, isLoading } = useCurrentUser()
  const loginMutation = useLoginMutation()
  const logoutMutation = useLogoutMutation()
  const switchContextMutation = useSwitchContextMutation()

  return {
    // User data
    user,
    isLoading,
    isAuthenticated: !!user && tokenService.hasValidToken(),

    // Actions
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    switchContext: switchContextMutation.mutateAsync,

    // States
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isSwitchingContext: switchContextMutation.isPending,
  }
}
```

### 2.3. Como Usar useAuth

```typescript
import { useAuth } from '@/features/auth/hooks/use-auth'

function UserProfile() {
  const { user, logout, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return (
    <div>
      <h1>Olá, {user.name}</h1>
      <p>Email: {user.email}</p>
      <Button onClick={() => logout()}>Sair</Button>
    </div>
  )
}
```

---

## 3. Platform Admin - Organizations

### 3.1. Organizations API

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

### 3.2. Como Usar Organizations API

#### Listar Organizações

```typescript
import { useOrganizations } from '@/features/platform-admin/api/organizations-api'

function OrganizationsList() {
  const { data, isLoading, error } = useOrganizations({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  if (isLoading) return <Skeleton />
  if (error) return <Alert>Erro ao carregar</Alert>

  return (
    <div>
      {data.data.map((org) => (
        <div key={org.id}>{org.name}</div>
      ))}
      <Pagination total={data.meta.totalPages} />
    </div>
  )
}
```

#### Buscar Organização por ID

```typescript
import { useOrganization } from '@/features/platform-admin/api/organizations-api'

function OrganizationDetails({ id }: { id: string }) {
  const { data: org, isLoading } = useOrganization(id)

  if (isLoading) return <Skeleton />

  return (
    <div>
      <h1>{org.name}</h1>
      <p>Slug: {org.slug}</p>
      <StatusBadge status={org.status} />
    </div>
  )
}
```

#### Criar Organização

```typescript
import { useCreateOrganization } from '@/features/platform-admin/api/organizations-api'

function CreateOrganizationForm() {
  const createMutation = useCreateOrganization()

  const handleSubmit = async (data: CreateOrganizationDto) => {
    try {
      await createMutation.mutateAsync(data)
      navigate('/platform-admin/organizations')
    } catch (error) {
      // Erro já tratado pela mutation
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Criando...' : 'Criar'}
      </Button>
    </form>
  )
}
```

#### Atualizar Organização

```typescript
import { useUpdateOrganization } from '@/features/platform-admin/api/organizations-api'

function EditOrganizationForm({ id }: { id: string }) {
  const updateMutation = useUpdateOrganization()

  const handleSubmit = async (data: UpdateOrganizationDto) => {
    await updateMutation.mutateAsync({ id, data })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button disabled={updateMutation.isPending}>Salvar</Button>
    </form>
  )
}
```

#### Alterar Status

```typescript
import { useUpdateOrganizationStatus } from '@/features/platform-admin/api/organizations-api'

function OrganizationStatusToggle({ id, currentStatus }: Props) {
  const updateStatusMutation = useUpdateOrganizationStatus()

  const handleToggle = async () => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await updateStatusMutation.mutateAsync({
      id,
      data: { status: newStatus, reason: 'Atualizado via admin panel' },
    })
  }

  return (
    <Switch
      checked={currentStatus === 'active'}
      onCheckedChange={handleToggle}
      disabled={updateStatusMutation.isPending}
    />
  )
}
```

---

## 4. Padrões de Query Keys

### 4.1. Hierarquia de Keys

```typescript
// Auth
['auth', 'user']                                    // Current user

// Organizations
['platform-admin', 'organizations']                 // Base key
['platform-admin', 'organizations', params]         // List with params
['platform-admin', 'organizations', '123']          // Single org by ID

// Clinics
['platform-admin', 'clinics']                       // Base key
['platform-admin', 'clinics', params]               // List with params
['platform-admin', 'clinics', '456']                // Single clinic by ID

// Users
['platform-admin', 'users']                         // Base key
['platform-admin', 'users', params]                 // List with params
['platform-admin', 'users', '789']                  // Single user by ID
```

### 4.2. Invalidação de Queries

```typescript
// Invalidar todas as organizations
queryClient.invalidateQueries({
  queryKey: ['platform-admin', 'organizations']
})

// Invalidar organization específica
queryClient.invalidateQueries({
  queryKey: ['platform-admin', 'organizations', id]
})

// Invalidar todas as queries do platform-admin
queryClient.invalidateQueries({
  queryKey: ['platform-admin']
})
```

---

## 5. Error Handling

### 5.1. Tratamento Global (Axios Interceptor)

Já configurado em `axios.ts` - mostra toast automático para erros.

### 5.2. Tratamento Local (Componente)

```typescript
import { useOrganizations } from '@/features/platform-admin/api/organizations-api'
import { Alert, AlertDescription } from '@/components/ui/alert'

function OrganizationsList() {
  const { data, isLoading, error, refetch } = useOrganizations(params)

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar organizações.
          <Button onClick={() => refetch()}>Tentar novamente</Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Rest of component...
}
```

---

## 6. Loading States

### 6.1. Skeleton Loading

```typescript
import { Skeleton } from '@/components/ui/skeleton'

function OrganizationsTableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Uso
function OrganizationsPage() {
  const { data, isLoading } = useOrganizations(params)

  if (isLoading) {
    return <OrganizationsTableSkeleton />
  }

  return <OrganizationsTable data={data} />
}
```

### 6.2. Mutation Loading

```typescript
function CreateButton() {
  const createMutation = useCreateOrganization()

  return (
    <Button disabled={createMutation.isPending}>
      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {createMutation.isPending ? 'Criando...' : 'Criar Organização'}
    </Button>
  )
}
```

---

## 7. Checklist de Implementação

### Fase 2: Autenticação (2-3 dias)

- [ ] Criar `src/features/auth/api/mutations.ts`
- [ ] Criar `src/features/auth/api/queries.ts`
- [ ] Criar `src/features/auth/hooks/use-auth.ts`
- [ ] Testar login/logout
- [ ] Testar switch context
- [ ] Testar forgot/reset password
- [ ] Testar verify email

### Fase 4: Organizations (2-3 dias)

- [ ] Criar `src/features/platform-admin/api/organizations-api.ts`
- [ ] Testar listagem de organizations
- [ ] Testar busca por ID
- [ ] Testar criação
- [ ] Testar atualização
- [ ] Testar alteração de status

---

## 8. Próximos Passos

1. Implementar Clinics e Users queries ([05 - Clinics & Users](./05-queries-mutations-clinics-users.md))
2. Criar tela de login ([06 - Login](./06-login-implementation.md))
3. Construir dashboard ([07 - Dashboard](./07-dashboard-implementation.md))

---

[← Anterior: Componentes](./03-shadcn-components.md) | [Índice](./00-index.md) | [Próximo: Clinics & Users →](./05-queries-mutations-clinics-users.md)

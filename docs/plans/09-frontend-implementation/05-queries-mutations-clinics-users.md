# 05 - Queries e Mutations - Clinics & Users

[← Anterior: Auth & Organizations](./04-queries-mutations-auth-orgs.md) | [Índice](./00-index.md) | [Próximo: Login →](./06-login-implementation.md)

---

## 1. Platform Admin - Clinics

### 1.1. Clinics API

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

### 1.2. Como Usar Clinics API

#### Listar Clínicas

```typescript
import { useClinics } from '@/features/platform-admin/api/clinics-api'

function ClinicsList() {
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    search: '',
    organizationId: undefined,
    status: 'all' as const,
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const,
  })

  const { data, isLoading } = useClinics(params)

  return (
    <div>
      <Input
        placeholder="Buscar clínicas..."
        value={params.search}
        onChange={(e) => setParams({ ...params, search: e.target.value })}
      />
      {isLoading ? (
        <ClinicsTableSkeleton />
      ) : (
        <ClinicsTable data={data.data} />
      )}
    </div>
  )
}
```

#### Criar Clínica

```typescript
import { useCreateClinic } from '@/features/platform-admin/api/clinics-api'

function CreateClinicForm() {
  const createMutation = useCreateClinic()

  const handleSubmit = async (values: CreateClinicDto) => {
    await createMutation.mutateAsync(values)
    navigate('/platform-admin/clinics')
  }

  return (
    <Form onSubmit={handleSubmit}>
      <FormField name="organizationId" label="Organização" />
      <FormField name="name" label="Nome da Clínica" />
      <FormField name="initialAdminId" label="Admin Inicial (opcional)" />
      <Button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Criando...' : 'Criar Clínica'}
      </Button>
    </Form>
  )
}
```

#### Transferir Clínica

```typescript
import { useTransferClinic } from '@/features/platform-admin/api/clinics-api'

function TransferClinicDialog({ clinicId }: { clinicId: string }) {
  const transferMutation = useTransferClinic()
  const [open, setOpen] = useState(false)

  const handleTransfer = async (data: TransferClinicDto) => {
    await transferMutation.mutateAsync({ id: clinicId, data })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Transferir Clínica</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir Clínica</DialogTitle>
        </DialogHeader>
        <Form onSubmit={handleTransfer}>
          <FormField name="targetOrganizationId" label="Organização Destino" />
          <FormField
            name="keepUsers"
            type="checkbox"
            label="Manter usuários vinculados"
          />
          <Button type="submit" disabled={transferMutation.isPending}>
            Transferir
          </Button>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 2. Platform Admin - Users

### 2.1. Users API

**Arquivo:** `src/features/platform-admin/api/users-api.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { tokenService } from '@/services/token.service'
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

### 2.2. Como Usar Users API

#### Listar Usuários com Filtros Avançados

```typescript
import { useUsers } from '@/features/platform-admin/api/users-api'

function UsersPage() {
  const [params, setParams] = useState<UserListParams>({
    page: 1,
    limit: 20,
    search: '',
    organizationId: undefined,
    clinicId: undefined,
    role: undefined,
    emailVerified: 'all',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const { data, isLoading } = useUsers(params)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-4">
        <Input
          placeholder="Buscar por nome ou email..."
          value={params.search}
          onChange={(e) => setParams({ ...params, search: e.target.value })}
        />
        <Select
          value={params.role || 'all'}
          onValueChange={(role) => setParams({ ...params, role: role as Role })}
        >
          <SelectItem value="all">Todas as Roles</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="doctor">Médico</SelectItem>
          <SelectItem value="secretary">Secretário</SelectItem>
        </Select>
        <Select
          value={params.status}
          onValueChange={(status) => setParams({ ...params, status })}
        >
          <SelectItem value="all">Todos os Status</SelectItem>
          <SelectItem value="active">Ativos</SelectItem>
          <SelectItem value="inactive">Inativos</SelectItem>
        </Select>
      </div>

      {/* Tabela */}
      {isLoading ? <UsersTableSkeleton /> : <UsersTable data={data} />}
    </div>
  )
}
```

#### Gerenciar Clínicas do Usuário

```typescript
import {
  useAddUserToClinic,
  useUpdateUserClinicRole,
  useRemoveUserFromClinic,
} from '@/features/platform-admin/api/users-api'

function UserClinicsManager({ userId, clinics }: Props) {
  const addMutation = useAddUserToClinic()
  const updateRoleMutation = useUpdateUserClinicRole()
  const removeMutation = useRemoveUserFromClinic()

  const handleAddClinic = async (clinicId: string, role: Role) => {
    await addMutation.mutateAsync({
      userId,
      data: { clinicId, role },
    })
  }

  const handleUpdateRole = async (clinicId: string, role: Role) => {
    await updateRoleMutation.mutateAsync({
      userId,
      clinicId,
      data: { role },
    })
  }

  const handleRemove = async (clinicId: string) => {
    await removeMutation.mutateAsync({ userId, clinicId })
  }

  return (
    <div>
      <h3>Clínicas do Usuário</h3>
      {clinics.map((clinic) => (
        <div key={clinic.clinicId}>
          <span>{clinic.clinicName}</span>
          <Badge>{clinic.role}</Badge>
          <DropdownMenu>
            <DropdownMenuItem onClick={() => handleUpdateRole(clinic.clinicId, 'admin')}>
              Alterar para Admin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRemove(clinic.clinicId)}>
              Remover
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      ))}
      <Button onClick={() => setShowAddDialog(true)}>
        Adicionar a Clínica
      </Button>
    </div>
  )
}
```

#### Ações Administrativas

```typescript
import {
  useResetUserPassword,
  useVerifyUserEmail,
  useRevokeUserSessions,
  useImpersonateUser,
} from '@/features/platform-admin/api/users-api'

function UserAdminActions({ userId }: { userId: string }) {
  const resetPasswordMutation = useResetUserPassword()
  const verifyEmailMutation = useVerifyUserEmail()
  const revokeSessionsMutation = useRevokeUserSessions()
  const impersonateMutation = useImpersonateUser()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => resetPasswordMutation.mutate({ id: userId, sendEmail: true })}
        >
          Resetar Senha (enviar email)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => verifyEmailMutation.mutate(userId)}>
          Verificar Email Manualmente
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => revokeSessionsMutation.mutate(userId)}>
          Revogar Todas as Sessões
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (confirm('Tem certeza que deseja fazer login como este usuário?')) {
              impersonateMutation.mutate(userId)
            }
          }}
        >
          <Shield className="mr-2 h-4 w-4" />
          Impersonate User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## 3. Padrões de Paginação

### 3.1. Hook de Paginação Customizado

**Arquivo:** `src/hooks/use-pagination.ts`

```typescript
import { useState } from 'react'

interface UsePaginationProps {
  initialPage?: number
  initialLimit?: number
}

export function usePagination({ initialPage = 1, initialLimit = 20 }: UsePaginationProps = {}) {
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1) // Reset to first page when limit changes
  }

  const reset = () => {
    setPage(initialPage)
    setLimit(initialLimit)
  }

  return {
    page,
    limit,
    setPage: handlePageChange,
    setLimit: handleLimitChange,
    reset,
  }
}
```

### 3.2. Componente de Paginação

```typescript
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-sm text-muted-foreground">
        Página {currentPage} de {totalPages}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

---

## 4. Checklist de Implementação

### Fase 5: Clinics (2-3 dias)

- [ ] Criar `src/features/platform-admin/api/clinics-api.ts`
- [ ] Implementar listagem de clínicas
- [ ] Implementar criação de clínica
- [ ] Implementar edição de clínica
- [ ] Implementar transferência de clínica
- [ ] Implementar alteração de status
- [ ] Testar todos os endpoints

### Fase 6: Users (2-3 dias)

- [ ] Criar `src/features/platform-admin/api/users-api.ts`
- [ ] Implementar listagem de usuários com filtros
- [ ] Implementar criação de usuário
- [ ] Implementar edição de usuário
- [ ] Implementar gerenciamento de clínicas do usuário
- [ ] Implementar ações administrativas (reset password, verify email, etc)
- [ ] Implementar impersonate user
- [ ] Testar todos os endpoints

### Helpers Adicionais

- [ ] Criar `src/hooks/use-pagination.ts`
- [ ] Criar componente `Pagination`
- [ ] Criar skeleton loaders para tabelas

---

## 5. Próximos Passos

1. Implementar tela de login ([06 - Login](./06-login-implementation.md))
2. Construir dashboard com as tabelas ([07 - Dashboard](./07-dashboard-implementation.md))
3. Revisar cronograma completo ([08 - Cronograma](./08-schedule-and-notes.md))

---

[← Anterior: Auth & Organizations](./04-queries-mutations-auth-orgs.md) | [Índice](./00-index.md) | [Próximo: Login →](./06-login-implementation.md)

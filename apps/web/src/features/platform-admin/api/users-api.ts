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

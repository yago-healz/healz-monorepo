import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PlatformAdmin, CreatePlatformAdminDto } from '@/types/api.types'

export const usePlatformAdmins = () => {
  return useQuery({
    queryKey: ['platform-admin', 'admins'],
    queryFn: async (): Promise<PlatformAdmin[]> => {
      const response = await api.get(ENDPOINTS.PLATFORM_ADMIN.ADMINS.LIST)
      return response.data.data
    },
  })
}

export const usePromotePlatformAdmin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CreatePlatformAdminDto) => {
      const response = await api.post(ENDPOINTS.PLATFORM_ADMIN.ADMINS.CREATE, dto)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'admins'] })
      toast.success('Usuário promovido a Platform Admin!')
    },
    onError: () => toast.error('Erro ao promover usuário'),
  })
}

export const useRevokePlatformAdmin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(ENDPOINTS.PLATFORM_ADMIN.ADMINS.REVOKE(id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'admins'] })
      toast.success('Permissões revogadas com sucesso!')
    },
    onError: () => toast.error('Erro ao revogar permissões'),
  })
}

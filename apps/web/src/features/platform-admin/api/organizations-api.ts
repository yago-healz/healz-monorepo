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

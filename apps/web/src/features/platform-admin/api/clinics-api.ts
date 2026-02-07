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

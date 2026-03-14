import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PaginatedResponse } from '@/types/api.types'
import type {
  CreateProcedureDto,
  ListProceduresParams,
  Procedure,
  UpdateProcedureDto,
} from '@/types/procedure.types'

export const useProcedures = (clinicId: string, params?: ListProceduresParams) => {
  return useQuery({
    queryKey: ['procedures', clinicId, params],
    queryFn: async (): Promise<PaginatedResponse<Procedure>> => {
      const response = await api.get(ENDPOINTS.PROCEDURES.LIST(clinicId), { params })
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useProcedure = (clinicId: string, id: string) => {
  return useQuery({
    queryKey: ['procedures', clinicId, id],
    queryFn: async (): Promise<Procedure> => {
      const response = await api.get(ENDPOINTS.PROCEDURES.GET(clinicId, id))
      return response.data
    },
    enabled: !!clinicId && !!id,
  })
}

export const useCreateProcedure = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProcedureDto): Promise<Procedure> => {
      const response = await api.post(ENDPOINTS.PROCEDURES.CREATE(clinicId), data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures', clinicId] })
      toast.success('Procedimento criado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao criar procedimento')
    },
  })
}

export const useUpdateProcedure = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProcedureDto }): Promise<Procedure> => {
      const response = await api.patch(ENDPOINTS.PROCEDURES.UPDATE(clinicId, id), data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures', clinicId] })
      toast.success('Procedimento atualizado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao atualizar procedimento')
    },
  })
}

export const useDeactivateProcedure = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(ENDPOINTS.PROCEDURES.DEACTIVATE(clinicId, id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures', clinicId] })
      toast.success('Procedimento removido com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao remover procedimento')
    },
  })
}

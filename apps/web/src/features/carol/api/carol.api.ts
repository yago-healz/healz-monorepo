import { api } from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { tokenService } from '@/services/token.service'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { CarolConfig, SaveCarolConfigRequest } from '../types'

const getClinicId = () => tokenService.getActiveClinicId() ?? ''

export const useCarolDraftConfig = () => {
  const clinicId = getClinicId()
  return useQuery<CarolConfig | null>({
    queryKey: ['carol', clinicId, 'config', 'draft'],
    queryFn: async () => {
      const { data } = await api.get(ENDPOINTS.CAROL.CONFIG(clinicId))
      return data
    },
    enabled: !!clinicId,
  })
}

export const useCarolPublishedConfig = () => {
  const clinicId = getClinicId()
  return useQuery<CarolConfig | null>({
    queryKey: ['carol', clinicId, 'config', 'published'],
    queryFn: async () => {
      const { data } = await api.get(ENDPOINTS.CAROL.CONFIG_PUBLISHED(clinicId))
      return data
    },
    enabled: !!clinicId,
  })
}

export const useSaveCarolConfig = () => {
  const clinicId = getClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SaveCarolConfigRequest) => {
      const { data: result } = await api.put(ENDPOINTS.CAROL.CONFIG(clinicId), data)
      return result as CarolConfig
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carol', clinicId, 'config', 'draft'] })
      toast.success('Configurações salvas como rascunho')
    },
    onError: () => {
      toast.error('Erro ao salvar configurações')
    },
  })
}

export const usePublishCarolConfig = () => {
  const clinicId = getClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(ENDPOINTS.CAROL.PUBLISH(clinicId))
      return data as CarolConfig
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carol', clinicId] })
      toast.success('Carol publicada com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao publicar Carol')
    },
  })
}

export const useSendMessage = () => {
  const clinicId = getClinicId()

  return useMutation({
    mutationFn: async (data: { message: string; version: 'draft' | 'published'; sessionId?: string }) => {
      const { data: result } = await api.post(ENDPOINTS.CAROL.CHAT(clinicId), data)
      return result as { reply: string; sessionId: string; toolsUsed?: string[] }
    },
  })
}

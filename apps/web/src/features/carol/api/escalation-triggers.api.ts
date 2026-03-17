import { api } from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { tokenService } from '@/services/token.service'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  CreateEscalationTriggerRequest,
  EscalationTrigger,
  UpdateEscalationTriggerRequest,
} from '../types/escalation-trigger.types'

const getClinicId = () => tokenService.getActiveClinicId() ?? ''

export const useEscalationTriggers = () => {
  const clinicId = getClinicId()
  return useQuery<EscalationTrigger[]>({
    queryKey: ['carol', clinicId, 'escalation-triggers'],
    queryFn: async () => {
      const { data } = await api.get(ENDPOINTS.CAROL.ESCALATION_TRIGGERS(clinicId))
      return data
    },
    enabled: !!clinicId,
  })
}

export const useCreateEscalationTrigger = () => {
  const clinicId = getClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateEscalationTriggerRequest) => {
      const { data: result } = await api.post(ENDPOINTS.CAROL.ESCALATION_TRIGGERS(clinicId), data)
      return result as EscalationTrigger
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carol', clinicId, 'escalation-triggers'] })
      toast.success('Regra de encaminhamento criada')
    },
    onError: () => {
      toast.error('Erro ao salvar regra de encaminhamento')
    },
  })
}

export const useUpdateEscalationTrigger = () => {
  const clinicId = getClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ triggerId, data }: { triggerId: string; data: UpdateEscalationTriggerRequest }) => {
      const { data: result } = await api.patch(ENDPOINTS.CAROL.ESCALATION_TRIGGER(clinicId, triggerId), data)
      return result as EscalationTrigger
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carol', clinicId, 'escalation-triggers'] })
      toast.success('Regra atualizada')
    },
    onError: () => {
      toast.error('Erro ao salvar regra de encaminhamento')
    },
  })
}

export const useDeleteEscalationTrigger = () => {
  const clinicId = getClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (triggerId: string) => {
      await api.delete(ENDPOINTS.CAROL.ESCALATION_TRIGGER(clinicId, triggerId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carol', clinicId, 'escalation-triggers'] })
      toast.success('Regra removida')
    },
    onError: () => {
      toast.error('Erro ao salvar regra de encaminhamento')
    },
  })
}

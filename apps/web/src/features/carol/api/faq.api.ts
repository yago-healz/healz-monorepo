import { api } from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { tokenService } from '@/services/token.service'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { CreateFaqRequest, FaqItem, UpdateFaqRequest } from '../types/faq.types'

const getClinicId = () => tokenService.getActiveClinicId() ?? ''

export const useFaqs = () => {
  const clinicId = getClinicId()
  return useQuery<FaqItem[]>({
    queryKey: ['carol', clinicId, 'faqs'],
    queryFn: async () => {
      const { data } = await api.get(ENDPOINTS.CAROL.FAQS(clinicId))
      return data
    },
    enabled: !!clinicId,
  })
}

export const useCreateFaq = () => {
  const clinicId = getClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateFaqRequest) => {
      const { data: result } = await api.post(ENDPOINTS.CAROL.FAQS(clinicId), data)
      return result as FaqItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carol', clinicId, 'faqs'] })
      toast.success('FAQ adicionado')
    },
    onError: () => {
      toast.error('Erro ao salvar FAQ')
    },
  })
}

export const useUpdateFaq = () => {
  const clinicId = getClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ faqId, data }: { faqId: string; data: UpdateFaqRequest }) => {
      const { data: result } = await api.patch(ENDPOINTS.CAROL.FAQ(clinicId, faqId), data)
      return result as FaqItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carol', clinicId, 'faqs'] })
      toast.success('FAQ atualizado')
    },
    onError: () => {
      toast.error('Erro ao salvar FAQ')
    },
  })
}

export const useDeleteFaq = () => {
  const clinicId = getClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (faqId: string) => {
      await api.delete(ENDPOINTS.CAROL.FAQ(clinicId, faqId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carol', clinicId, 'faqs'] })
      toast.success('FAQ removido')
    },
    onError: () => {
      toast.error('Erro ao remover FAQ')
    },
  })
}

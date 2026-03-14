import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { tokenService } from '@/services/token.service'
import type { PaymentMethod, CreatePaymentMethodDto, UpdatePaymentMethodDto } from '@/types/payment-method.types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function usePaymentMethods(clinicId: string) {
  return useQuery({
    queryKey: ['payment-methods', clinicId],
    queryFn: async (): Promise<PaymentMethod[]> => {
      const response = await api.get(ENDPOINTS.PAYMENT_METHODS.LIST(clinicId))
      return response.data
    },
    enabled: !!clinicId,
  })
}

export function useCreatePaymentMethod() {
  const clinicId = tokenService.getActiveClinicId() ?? ''
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePaymentMethodDto) => {
      const response = await api.post(ENDPOINTS.PAYMENT_METHODS.CREATE(clinicId), data)
      return response.data as PaymentMethod
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', clinicId] })
      toast.success('Forma de pagamento criada com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao criar forma de pagamento.')
    },
  })
}

export function useUpdatePaymentMethod() {
  const clinicId = tokenService.getActiveClinicId() ?? ''
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePaymentMethodDto }) => {
      const response = await api.patch(ENDPOINTS.PAYMENT_METHODS.UPDATE(clinicId, id), data)
      return response.data as PaymentMethod
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', clinicId] })
      toast.success('Forma de pagamento atualizada com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao atualizar forma de pagamento.')
    },
  })
}

export function useDeactivatePaymentMethod() {
  const clinicId = tokenService.getActiveClinicId() ?? ''
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(ENDPOINTS.PAYMENT_METHODS.DEACTIVATE(clinicId, id))
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', clinicId] })
      toast.success('Forma de pagamento desativada.')
    },
    onError: () => {
      toast.error('Erro ao desativar forma de pagamento.')
    },
  })
}

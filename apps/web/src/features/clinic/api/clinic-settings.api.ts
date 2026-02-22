import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'
import { CLINIC_SETTINGS_ENDPOINTS } from '@/lib/api/clinic-settings-endpoints'
import type {
  Priority,
  PainPoint,
  Service,
  TimeBlock,
  NotificationSettings,
} from '@/types/onboarding'

// ============================================
// OBJECTIVES
// ============================================

export interface ClinicObjectivesResponse {
  id: string
  clinicId: string
  priorities: Priority[]
  painPoints: PainPoint[]
  additionalNotes?: string
  createdAt: string
  updatedAt?: string
}

export const useClinicObjectives = (clinicId: string) => {
  return useQuery({
    queryKey: ['clinic', clinicId, 'settings', 'objectives'],
    queryFn: async (): Promise<ClinicObjectivesResponse | null> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.OBJECTIVES(clinicId)
      )
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useSaveClinicObjectives = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      priorities: Omit<Priority, 'icon'>[]
      painPoints: Omit<PainPoint, 'icon'>[]
      additionalNotes?: string
    }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.OBJECTIVES(clinicId),
        data
      )
      return response.data as ClinicObjectivesResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clinic', clinicId, 'settings', 'objectives'],
      })
      toast.success('Objetivos salvos com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar objetivos')
    },
  })
}

// ============================================
// SERVICES
// ============================================

export interface ClinicServicesResponse {
  id: string
  clinicId: string
  services: Service[]
  createdAt: string
  updatedAt?: string
}

export const useClinicServices = (clinicId: string) => {
  return useQuery({
    queryKey: ['clinic', clinicId, 'settings', 'services'],
    queryFn: async (): Promise<ClinicServicesResponse | null> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.SERVICES(clinicId)
      )
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useSaveClinicServices = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { services: Service[] }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.SERVICES(clinicId),
        data
      )
      return response.data as ClinicServicesResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clinic', clinicId, 'settings', 'services'],
      })
      toast.success('Serviços salvos com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar serviços')
    },
  })
}

// ============================================
// SCHEDULING
// ============================================

export interface ClinicSchedulingResponse {
  id: string
  clinicId: string
  timeBlocks: TimeBlock[]
  minimumInterval: number
  createdAt: string
  updatedAt?: string
}

export const useClinicScheduling = (clinicId: string) => {
  return useQuery({
    queryKey: ['clinic', clinicId, 'settings', 'scheduling'],
    queryFn: async (): Promise<ClinicSchedulingResponse | null> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.SCHEDULING(clinicId)
      )
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useSaveClinicScheduling = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      timeBlocks: TimeBlock[]
      minimumInterval: number
    }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.SCHEDULING(clinicId),
        data
      )
      return response.data as ClinicSchedulingResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clinic', clinicId, 'settings', 'scheduling'],
      })
      toast.success('Configurações de agendamento salvas com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar configurações de agendamento')
    },
  })
}

// ============================================
// CAROL SETTINGS
// ============================================

export interface ClinicCarolSettingsResponse {
  id: string
  clinicId: string
  selectedTraits: string[]
  greeting: string
  restrictSensitiveTopics: boolean
  createdAt: string
  updatedAt?: string
}

export const useClinicCarolSettings = (clinicId: string) => {
  return useQuery({
    queryKey: ['clinic', clinicId, 'settings', 'carol'],
    queryFn: async (): Promise<ClinicCarolSettingsResponse | null> => {
      const response = await api.get(CLINIC_SETTINGS_ENDPOINTS.CAROL(clinicId))
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useSaveClinicCarolSettings = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      selectedTraits: string[]
      greeting: string
      restrictSensitiveTopics: boolean
    }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.CAROL(clinicId),
        data
      )
      return response.data as ClinicCarolSettingsResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clinic', clinicId, 'settings', 'carol'],
      })
      toast.success('Configurações do Carol salvas com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar configurações do Carol')
    },
  })
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface ClinicNotificationsResponse {
  id: string
  clinicId: string
  notificationSettings: NotificationSettings
  alertChannel: 'whatsapp' | 'email'
  phoneNumber?: string
  createdAt: string
  updatedAt?: string
}

export const useClinicNotifications = (clinicId: string) => {
  return useQuery({
    queryKey: ['clinic', clinicId, 'settings', 'notifications'],
    queryFn: async (): Promise<ClinicNotificationsResponse | null> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.NOTIFICATIONS(clinicId)
      )
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useSaveClinicNotifications = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      notificationSettings: NotificationSettings
      alertChannel: 'whatsapp' | 'email'
      phoneNumber?: string
    }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.NOTIFICATIONS(clinicId),
        data
      )
      return response.data as ClinicNotificationsResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clinic', clinicId, 'settings', 'notifications'],
      })
      toast.success('Configurações de notificações salvas com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar configurações de notificações')
    },
  })
}

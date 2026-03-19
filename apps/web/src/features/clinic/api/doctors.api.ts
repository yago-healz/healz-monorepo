import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { tokenService } from '@/services/token.service'
import type {
  CreateDoctorProfileDto,
  DoctorProfile,
  DoctorSchedule,
  SaveDoctorScheduleDto,
  UpdateDoctorClinicDto,
  UpdateDoctorProfileDto,
} from '@/types/doctor.types'

export const useMyDoctorProfile = () => {
  const clinicId = tokenService.getActiveClinicId()

  return useQuery({
    queryKey: ['doctors', clinicId, 'me'],
    queryFn: async (): Promise<DoctorProfile> => {
      const response = await api.get(ENDPOINTS.DOCTORS.ME(clinicId!))
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useDoctors = () => {
  const clinicId = tokenService.getActiveClinicId()

  return useQuery({
    queryKey: ['doctors', clinicId],
    queryFn: async (): Promise<DoctorProfile[]> => {
      const response = await api.get(ENDPOINTS.DOCTORS.LIST(clinicId!))
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useDoctor = (doctorId: string) => {
  const clinicId = tokenService.getActiveClinicId()

  return useQuery({
    queryKey: ['doctors', clinicId, doctorId],
    queryFn: async (): Promise<DoctorProfile> => {
      const response = await api.get(ENDPOINTS.DOCTORS.GET(clinicId!, doctorId))
      return response.data
    },
    enabled: !!clinicId && !!doctorId,
  })
}

export const useDoctorSchedule = (doctorId: string) => {
  const clinicId = tokenService.getActiveClinicId()

  return useQuery({
    queryKey: ['doctors', clinicId, doctorId, 'schedule'],
    queryFn: async (): Promise<DoctorSchedule> => {
      const response = await api.get(ENDPOINTS.DOCTORS.GET_SCHEDULE(clinicId!, doctorId))
      return response.data
    },
    enabled: !!clinicId && !!doctorId,
  })
}

export const useCreateDoctor = () => {
  const clinicId = tokenService.getActiveClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateDoctorProfileDto): Promise<DoctorProfile> => {
      const response = await api.post(ENDPOINTS.DOCTORS.CREATE(clinicId!), data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', clinicId] })
      toast.success('Médico adicionado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao adicionar médico')
    },
  })
}

export const useUpdateDoctor = (doctorId: string) => {
  const clinicId = tokenService.getActiveClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateDoctorProfileDto): Promise<DoctorProfile> => {
      const response = await api.patch(ENDPOINTS.DOCTORS.UPDATE(clinicId!, doctorId), data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', clinicId] })
      toast.success('Médico atualizado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao atualizar médico')
    },
  })
}

export const useDeactivateDoctor = () => {
  const clinicId = tokenService.getActiveClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (doctorId: string): Promise<void> => {
      await api.delete(ENDPOINTS.DOCTORS.DEACTIVATE(clinicId!, doctorId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', clinicId] })
      toast.success('Médico desativado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao desativar médico')
    },
  })
}

export const useUpdateDoctorLink = (doctorId: string) => {
  const clinicId = tokenService.getActiveClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateDoctorClinicDto): Promise<DoctorProfile> => {
      const response = await api.patch(ENDPOINTS.DOCTORS.UPDATE_LINK(clinicId!, doctorId), data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', clinicId, doctorId] })
      toast.success('Vínculo atualizado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao atualizar vínculo')
    },
  })
}

// ============================================
// DOCTOR CONNECTORS
// ============================================

export interface DoctorConnectorStatus {
  googleCalendar: boolean
  whatsapp: boolean
}

export interface DoctorGoogleCalendar {
  id: string
  summary: string
  description?: string
  primary?: boolean
}

export const useDoctorConnectors = (doctorId: string) => {
  const clinicId = tokenService.getActiveClinicId()

  return useQuery({
    queryKey: ['doctors', clinicId, doctorId, 'connectors'],
    queryFn: async (): Promise<DoctorConnectorStatus> => {
      const response = await api.get(ENDPOINTS.DOCTORS.CONNECTORS(clinicId!, doctorId))
      return response.data
    },
    enabled: !!clinicId && !!doctorId,
  })
}

export const useDoctorGoogleCalendarCalendars = (doctorId: string, enabled: boolean) => {
  const clinicId = tokenService.getActiveClinicId()

  return useQuery({
    queryKey: ['doctors', clinicId, doctorId, 'google-calendar', 'calendars'],
    queryFn: async (): Promise<DoctorGoogleCalendar[]> => {
      const response = await api.get(ENDPOINTS.DOCTORS.GOOGLE_CALENDAR_CALENDARS(clinicId!, doctorId))
      return response.data
    },
    enabled: !!clinicId && !!doctorId && enabled,
  })
}

export const useSelectDoctorGoogleCalendar = (doctorId: string) => {
  const clinicId = tokenService.getActiveClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ calendarId, calendarName }: { calendarId: string; calendarName: string }) => {
      const response = await api.post(
        ENDPOINTS.DOCTORS.GOOGLE_CALENDAR_SELECT(clinicId!, doctorId),
        { calendarId, calendarName },
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', clinicId, doctorId, 'connectors'] })
      toast.success('Calendário vinculado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao vincular calendário. Tente novamente.')
    },
  })
}

export const useDisconnectDoctorGoogleCalendar = (doctorId: string) => {
  const clinicId = tokenService.getActiveClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete(
        ENDPOINTS.DOCTORS.GOOGLE_CALENDAR_DISCONNECT(clinicId!, doctorId),
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', clinicId, doctorId, 'connectors'] })
      toast.success('Google Calendar desconectado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao desconectar. Tente novamente.')
    },
  })
}

export const useSaveDoctorSchedule = (doctorId: string) => {
  const clinicId = tokenService.getActiveClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SaveDoctorScheduleDto): Promise<DoctorSchedule> => {
      const response = await api.patch(ENDPOINTS.DOCTORS.SAVE_SCHEDULE(clinicId!, doctorId), data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', clinicId, doctorId, 'schedule'] })
      toast.success('Agenda salva com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar agenda')
    },
  })
}

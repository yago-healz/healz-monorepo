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

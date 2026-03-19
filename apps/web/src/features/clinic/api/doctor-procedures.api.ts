import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type {
  CreateAndLinkProcedureDto,
  DoctorProcedure,
  LinkDoctorProcedureDto,
  UpdateDoctorProcedureDto,
} from '@/types/doctor.types'

export const useDoctorProcedures = (clinicId: string, doctorId: string) => {
  return useQuery({
    queryKey: ['doctor-procedures', clinicId, doctorId],
    queryFn: async (): Promise<DoctorProcedure[]> => {
      const response = await api.get(ENDPOINTS.DOCTORS.PROCEDURES.LIST(clinicId, doctorId))
      return response.data
    },
    enabled: !!clinicId && !!doctorId,
  })
}

export const useLinkDoctorProcedure = (clinicId: string, doctorId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: LinkDoctorProcedureDto): Promise<DoctorProcedure> => {
      const response = await api.post(ENDPOINTS.DOCTORS.PROCEDURES.LINK(clinicId, doctorId), data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-procedures', clinicId, doctorId] })
      toast.success('Procedimento vinculado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao vincular procedimento')
    },
  })
}

export const useUpdateDoctorProcedure = (clinicId: string, doctorId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      procedureId,
      data,
    }: {
      procedureId: string
      data: UpdateDoctorProcedureDto
    }): Promise<DoctorProcedure> => {
      const response = await api.patch(
        ENDPOINTS.DOCTORS.PROCEDURES.UPDATE(clinicId, doctorId, procedureId),
        data,
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-procedures', clinicId, doctorId] })
      toast.success('Vínculo atualizado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao atualizar vínculo')
    },
  })
}

export const useCreateAndLinkProcedure = (clinicId: string, doctorId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAndLinkProcedureDto): Promise<DoctorProcedure> => {
      const response = await api.post(
        ENDPOINTS.DOCTORS.CREATE_AND_LINK_PROCEDURE(clinicId, doctorId),
        data,
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-procedures', clinicId, doctorId] })
      queryClient.invalidateQueries({ queryKey: ['procedures', clinicId] })
      toast.success('Procedimento criado e vinculado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao criar procedimento')
    },
  })
}

export const useUnlinkDoctorProcedure = (clinicId: string, doctorId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (procedureId: string): Promise<void> => {
      await api.delete(ENDPOINTS.DOCTORS.PROCEDURES.UNLINK(clinicId, doctorId, procedureId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-procedures', clinicId, doctorId] })
      toast.success('Procedimento desvinculado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao desvincular procedimento')
    },
  })
}

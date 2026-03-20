import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { tokenService } from '@/services/token.service'
import type { CalendarEvent } from '@/types/doctor.types'

export const useDoctorCalendarEvents = (
  doctorId: string | null,
  timeMin: string,
  timeMax: string,
) => {
  const clinicId = tokenService.getActiveClinicId()

  return useQuery({
    queryKey: ['doctor-calendar-events', clinicId, doctorId, timeMin, timeMax],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const response = await api.get(ENDPOINTS.DOCTORS.CALENDAR_EVENTS(clinicId!, doctorId!), {
        params: { timeMin, timeMax },
      })
      return response.data
    },
    enabled: !!clinicId && !!doctorId && !!timeMin && !!timeMax,
    staleTime: 5 * 60 * 1000,
  })
}

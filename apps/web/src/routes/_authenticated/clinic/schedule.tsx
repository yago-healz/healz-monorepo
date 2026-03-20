import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { AlertCircle, CalendarX } from 'lucide-react'
import { useUserRole } from '@/hooks/use-user-role'
import { useMyDoctorProfile, useDoctors } from '@/features/clinic/api/doctors.api'
import { useDoctorCalendarEvents } from '@/features/clinic/api/doctor-calendar.api'
import { DoctorSelector } from '@/features/clinic/components/schedule/doctor-selector'
import { ScheduleCalendar } from '@/features/clinic/components/schedule/schedule-calendar'

export const Route = createFileRoute('/_authenticated/clinic/schedule')({
  component: SchedulePage,
})

function SchedulePage() {
  const { isDoctor, isLoading: roleLoading } = useUserRole()
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState(() => ({
    start: startOfDay(new Date()).toISOString(),
    end: endOfDay(new Date()).toISOString(),
  }))

  // For doctor role: load own profile and auto-select
  const { data: myProfile, isLoading: profileLoading } = useMyDoctorProfile()

  // For non-doctor roles: load all doctors
  const { data: doctors = [], isLoading: doctorsLoading } = useDoctors()

  const effectiveDoctorId = isDoctor ? (myProfile?.id ?? null) : selectedDoctorId

  const {
    data: events = [],
    isLoading: eventsLoading,
    error: eventsError,
  } = useDoctorCalendarEvents(effectiveDoctorId, timeRange.start, timeRange.end)

  const handleRangeChange = useCallback((start: Date, end: Date) => {
    setTimeRange({
      start: startOfDay(start).toISOString(),
      end: endOfDay(end).toISOString(),
    })
  }, [])

  const isNotConnected =
    eventsError &&
    (eventsError as { response?: { status?: number } })?.response?.status === 404

  const isLoading = roleLoading || profileLoading || eventsLoading

  return (
    <div className="flex flex-col h-full gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
        {!isDoctor && (
          <DoctorSelector
            doctors={doctors}
            selectedDoctorId={selectedDoctorId}
            onSelect={setSelectedDoctorId}
            isLoading={doctorsLoading}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {!isDoctor && !selectedDoctorId ? (
          <EmptyState
            icon={<CalendarX className="h-8 w-8 text-muted-foreground" />}
            message="Selecione um médico para visualizar a agenda"
          />
        ) : isNotConnected ? (
          <EmptyState
            icon={<AlertCircle className="h-8 w-8 text-muted-foreground" />}
            message="Este médico ainda não conectou o Google Calendar"
          />
        ) : (
          <ScheduleCalendar
            events={events}
            isLoading={isLoading}
            onRangeChange={handleRangeChange}
          />
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

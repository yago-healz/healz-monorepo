import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { tokenService } from '@/services/token.service'
import { useMyDoctorProfile } from '@/features/clinic/api/doctors.api'
import { DoctorProfileCard } from '@/features/clinic/components/doctors/doctor-profile-card'
import { DoctorScheduleTab } from '@/features/clinic/components/doctors/doctor-schedule-tab'
import { DoctorProceduresTab } from '@/features/clinic/components/doctors/doctor-procedures-tab'
import { DoctorConnectorsTab } from '@/features/clinic/components/doctors/doctor-connectors-tab'

const searchSchema = z.object({
  tab: z.enum(['perfil', 'agenda', 'procedimentos', 'conectores']).optional().catch('perfil'),
  gcal: z.string().optional(),
  reason: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/clinic/profile')({
  beforeLoad: () => {
    const user = tokenService.getUser()
    const role = user?.activeClinic?.role
    if (role !== 'doctor') {
      throw redirect({ to: '/clinic' })
    }
  },
  validateSearch: searchSchema,
  component: DoctorProfilePage,
})

const tabs = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'procedimentos', label: 'Procedimentos' },
  { id: 'conectores', label: 'Conectores' },
] as const

type TabId = (typeof tabs)[number]['id']

function DoctorProfilePage() {
  const { tab: activeTab = 'perfil', gcal, reason } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const handleGcalHandled = useCallback(() => {
    navigate({ search: (prev) => ({ ...prev, gcal: undefined, reason: undefined }), replace: true })
  }, [navigate])
  const { data: doctor, isLoading } = useMyDoctorProfile()

  function handleTabChange(tabId: TabId) {
    navigate({ search: (prev) => ({ ...prev, tab: tabId }), replace: true })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Perfil médico não encontrado.</p>
        <p className="text-sm">Entre em contato com o administrador da clínica.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">{doctor.specialty ?? 'Sem especialidade'}</p>
      </div>

      <Separator />

      <div className="flex gap-8">
        <nav className="w-48 shrink-0 flex flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'w-full text-left rounded-md px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === 'perfil' && <DoctorProfileCard doctorId={doctor.id} isSelfView />}
          {activeTab === 'agenda' && <DoctorScheduleTab doctorId={doctor.id} />}
          {activeTab === 'procedimentos' && (
            <DoctorProceduresTab doctorId={doctor.id} isSelfView />
          )}
          {activeTab === 'conectores' && (
            <DoctorConnectorsTab
              doctorId={doctor.id}
              gcal={gcal}
              reason={reason}
              onGcalHandled={handleGcalHandled}
            />
          )}
        </div>
      </div>
    </div>
  )
}

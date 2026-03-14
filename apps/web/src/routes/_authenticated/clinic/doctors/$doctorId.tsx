import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { tokenService } from '@/services/token.service'
import { useDoctor } from '@/features/clinic/api/doctors.api'
import { DoctorProceduresTab } from '@/features/clinic/components/doctors/doctor-procedures-tab'
import { DoctorProfileCard } from '@/features/clinic/components/doctors/doctor-profile-card'
import { DoctorScheduleTab } from '@/features/clinic/components/doctors/doctor-schedule-tab'

const searchSchema = z.object({
  tab: z.enum(['perfil', 'agenda', 'procedimentos']).optional().catch('perfil'),
})

export const Route = createFileRoute('/_authenticated/clinic/doctors/$doctorId')({
  beforeLoad: () => {
    const user = tokenService.getUser()
    const role = user?.activeClinic?.role
    if (role !== 'admin' && role !== 'manager') {
      throw redirect({ to: '/clinic' })
    }
  },
  validateSearch: searchSchema,
  component: DoctorDetailPage,
})

const tabs = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'procedimentos', label: 'Procedimentos' },
] as const

type TabId = (typeof tabs)[number]['id']

function DoctorDetailPage() {
  const { doctorId } = Route.useParams()
  const { tab: activeTab = 'perfil' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: doctor, isLoading } = useDoctor(doctorId)

  function handleTabChange(tabId: TabId) {
    navigate({ search: (prev) => ({ ...prev, tab: tabId }), replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/clinic/doctors' as never })}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <div>
          {isLoading ? (
            <div className="space-y-1">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight">{doctor?.name}</h1>
              <p className="text-muted-foreground">{doctor?.specialty ?? 'Sem especialidade'}</p>
            </>
          )}
        </div>
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
          {activeTab === 'perfil' && <DoctorProfileCard doctorId={doctorId} />}
          {activeTab === 'agenda' && <DoctorScheduleTab doctorId={doctorId} />}
          {activeTab === 'procedimentos' && <DoctorProceduresTab doctorId={doctorId} />}
        </div>
      </div>
    </div>
  )
}

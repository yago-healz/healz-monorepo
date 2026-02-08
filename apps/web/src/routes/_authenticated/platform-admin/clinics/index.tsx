import { ClinicsTable } from '@/features/platform-admin/components/clinics/clinics-table'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/platform-admin/clinics/')({
  component: ClinicsPage,
})

function ClinicsPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clínicas</h1>
          <p className="text-muted-foreground">
            Gerencie todas as clínicas da plataforma
          </p>
        </div>
        <Button onClick={() => navigate({ to: '/platform-admin/clinics/new' })}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Clínica
        </Button>
      </div>

      <ClinicsTable />
    </div>
  )
}

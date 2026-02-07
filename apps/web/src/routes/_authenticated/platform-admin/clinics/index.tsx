import { ClinicsTable } from '@/features/platform-admin/components/clinics/clinics-table'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/platform-admin/clinics/')({
  component: ClinicsPage,
})

function ClinicsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clínicas</h1>
        <p className="text-muted-foreground">
          Gerencie todas as clínicas da plataforma
        </p>
      </div>

      <ClinicsTable />
    </div>
  )
}

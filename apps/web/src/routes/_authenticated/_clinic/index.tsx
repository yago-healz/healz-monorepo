import { createFileRoute } from '@tanstack/react-router'
import { useUserRole } from '@/hooks/use-user-role'

export const Route = createFileRoute('/_authenticated/_clinic/')({
  component: ClinicDashboard,
})

function ClinicDashboard() {
  const { activeClinic } = useUserRole()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard - {activeClinic?.name}
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo ao painel da clínica
        </p>
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          Dashboard em desenvolvimento...
        </p>
      </div>
    </div>
  )
}

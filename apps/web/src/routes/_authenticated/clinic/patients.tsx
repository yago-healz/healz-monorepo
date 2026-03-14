import { createFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/clinic/patients')({
  component: PatientsPage,
})

function PatientsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pacientes</h1>
        <p className="text-muted-foreground mt-1">Esta funcionalidade estará disponível em breve.</p>
      </div>
    </div>
  )
}

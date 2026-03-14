import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DoctorsTable } from '@/features/clinic/components/doctors/doctors-table'
import { DoctorFormDialog } from '@/features/clinic/components/doctors/doctor-form-dialog'
import { tokenService } from '@/services/token.service'

export const Route = createFileRoute('/_authenticated/clinic/doctors/')({
  beforeLoad: () => {
    const user = tokenService.getUser()
    const role = user?.activeClinic?.role
    if (role !== 'admin' && role !== 'manager') {
      throw redirect({ to: '/clinic' })
    }
  },
  component: DoctorsPage,
})

function DoctorsPage() {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Médicos</h1>
          <p className="text-muted-foreground max-w-md">
            Gerencie os médicos da clínica, seus vínculos e agendas.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Médico
        </Button>
      </div>

      <DoctorsTable />

      <DoctorFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

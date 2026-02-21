import { createFileRoute } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MembersTable } from '@/features/clinic/components/members/members-table'

export const Route = createFileRoute('/_authenticated/clinic/members')({
  component: MembersPage,
})

function MembersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Membros</h1>
          <p className="text-muted-foreground max-w-md">
            Gerencie os acessos da sua equipe e coordene a jornada do paciente
            com permissões granulares.
          </p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Convidar membro
        </Button>
      </div>
      <MembersTable />
    </div>
  )
}

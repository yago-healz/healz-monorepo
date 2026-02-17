import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { UsersTable } from '@/features/platform-admin/components/users/users-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/admin/users/')({
  component: UsersPage,
})

function UsersPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie todos os usuários da plataforma
          </p>
        </div>
        <Button onClick={() => navigate({ to: '/admin/users/new' })}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <UsersTable />
    </div>
  )
}

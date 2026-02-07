import { createFileRoute } from '@tanstack/react-router'
import { UsersTable } from '@/features/platform-admin/components/users/users-table'

export const Route = createFileRoute('/_authenticated/platform-admin/users/')({
  component: UsersPage,
})

function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie todos os usuários da plataforma
        </p>
      </div>

      <UsersTable />
    </div>
  )
}

import { OrganizationsTable } from '@/features/platform-admin/components/organizations/organizations-table'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/admin/organizations/')({
  component: OrganizationsPage,
})

function OrganizationsPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizações</h1>
          <p className="text-muted-foreground">
            Gerencie todas as organizações da plataforma
          </p>
        </div>
        <Button onClick={() => navigate({ to: '/admin/organizations/new' })}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Organização
        </Button>
      </div>

      <OrganizationsTable />
    </div>
  )
}

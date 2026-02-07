import { OrganizationsTable } from '@/features/platform-admin/components/organizations/organizations-table'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/platform-admin/organizations/')({
  component: OrganizationsPage,
})

function OrganizationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organizações</h1>
        <p className="text-muted-foreground">
          Gerencie todas as organizações da plataforma
        </p>
      </div>

      <OrganizationsTable />
    </div>
  )
}

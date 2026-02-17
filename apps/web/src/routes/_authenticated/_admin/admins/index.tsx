import { createFileRoute } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'
import { PlatformAdminsTable } from '@/features/platform-admin/components/platform-admins/platform-admins-table'
import { PromoteAdminDialog } from '@/features/platform-admin/components/platform-admins/promote-admin-dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/_authenticated/_admin/admins/')({
  component: PlatformAdminsPage,
})

function PlatformAdminsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Admins</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários com permissões de administrador da plataforma
          </p>
        </div>
        <PromoteAdminDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Administradores Ativos
          </CardTitle>
          <CardDescription>
            Usuários com acesso total ao painel de administração da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformAdminsTable />
        </CardContent>
      </Card>
    </div>
  )
}

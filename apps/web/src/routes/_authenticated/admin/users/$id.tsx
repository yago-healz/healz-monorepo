import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useUser, useUpdateUser, useUpdateUserStatus } from '@/features/platform-admin/api/users-api'
import { UserForm } from '@/features/platform-admin/components/users/user-form'
import { UserClinicsManager } from '@/features/platform-admin/components/users/user-clinics-manager'
import { UserAdminActions } from '@/features/platform-admin/components/users/user-admin-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, User, Calendar, CheckCircle, XCircle, PowerOff, Power } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const Route = createFileRoute('/_authenticated/admin/users/$id')({
  component: UserDetailsPage,
})

function UserDetailsPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: user, isLoading } = useUser(id)
  const updateMutation = useUpdateUser()
  const updateStatus = useUpdateUserStatus()

  const handleSubmit = async (data: any) => {
    await updateMutation.mutateAsync({ id, data })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <h2 className="text-2xl font-bold">Usuário não encontrado</h2>
        <Button onClick={() => navigate({ to: '/admin/users' })}>
          Voltar para lista
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/admin/users' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
              <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                {user.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
              {user.emailVerified ? (
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Email Verificado
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Email Não Verificado
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Detalhes e configurações do usuário
            </p>
          </div>
        </div>

        {user.status === 'active' ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" disabled={updateStatus.isPending}>
                <PowerOff className="h-4 w-4" />
                Desativar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar {user.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  O usuário perderá acesso ao sistema e todas as sessões serão encerradas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => updateStatus.mutate({ id, data: { status: 'inactive', revokeTokens: true } })}
                >
                  Desativar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            variant="outline"
            className="gap-2"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ id, data: { status: 'active', revokeTokens: false } })}
          >
            <Power className="h-4 w-4" />
            Ativar
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">ID</p>
              <p className="text-sm font-mono">{user.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                {user.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email Verificado</p>
              {user.emailVerified ? (
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Sim
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Não
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Datas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Criado em</p>
              <p className="text-sm">
                {user.createdAt
                  ? format(new Date(user.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
                  : 'N/A'}
              </p>
            </div>
            {user.updatedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Última atualização</p>
                <p className="text-sm">
                  {format(new Date(user.updatedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
            {user.lastLoginAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Último login</p>
                <p className="text-sm">
                  {format(new Date(user.lastLoginAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UserClinicsManager user={user} />

      <UserAdminActions user={user} />

      <Card>
        <CardHeader>
          <CardTitle>Editar Usuário</CardTitle>
          <CardDescription>
            Atualize as informações do usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            user={user}
            onSubmit={handleSubmit}
            isSubmitting={updateMutation.isPending}
            submitLabel="Salvar Alterações"
          />
        </CardContent>
      </Card>
    </div>
  )
}

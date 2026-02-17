import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useClinic, useUpdateClinic, useUpdateClinicStatus } from '@/features/platform-admin/api/clinics-api'
import { ClinicForm } from '@/features/platform-admin/components/clinics/clinic-form'
import { TransferClinicDialog } from '@/features/platform-admin/components/clinics/transfer-clinic-dialog'
import { ClinicUsersTable } from '@/features/platform-admin/components/clinics/clinic-users-table'
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
import { ArrowLeft, Ban, Building, Calendar, CheckCircle, Users } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const Route = createFileRoute('/_authenticated/admin/clinics/$id')({
  component: ClinicDetailsPage,
})

function ClinicDetailsPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: clinic, isLoading } = useClinic(id)
  const updateMutation = useUpdateClinic()
  const updateStatus = useUpdateClinicStatus()

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

  if (!clinic) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <h2 className="text-2xl font-bold">Clínica não encontrada</h2>
        <Button onClick={() => navigate({ to: '/admin/clinics' })}>
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
            onClick={() => navigate({ to: '/admin/clinics' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{clinic.name}</h1>
              <Badge variant={clinic.status === 'active' ? 'default' : 'secondary'}>
                {clinic.status === 'active' ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Detalhes e configurações da clínica
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TransferClinicDialog
            clinicId={clinic.id}
            clinicName={clinic.name}
            currentOrganizationId={clinic.organizationId}
          />

          {clinic.status === 'active' ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Ban className="mr-2 h-4 w-4" />
                  Desativar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desativar clínica?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso desativará "{clinic.name}". Os usuários vinculados não conseguirão acessar esta clínica.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => updateStatus.mutate({ id, data: { status: 'inactive' } })}
                  >
                    Desativar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus.mutate({ id, data: { status: 'active' } })}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Ativar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">ID</p>
              <p className="text-sm font-mono">{clinic.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Organização</p>
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => navigate({ to: '/admin/organizations/$id', params: { id: clinic.organizationId } })}
              >
                {clinic.organizationName || clinic.organizationId}
              </Button>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={clinic.status === 'active' ? 'default' : 'secondary'}>
                {clinic.status === 'active' ? 'Ativa' : 'Inativa'}
              </Badge>
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
              <p className="text-sm font-medium text-muted-foreground">Criada em</p>
              <p className="text-sm">
                {clinic.createdAt
                  ? format(new Date(clinic.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
                  : 'N/A'}
              </p>
            </div>
            {clinic.updatedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Última atualização</p>
                <p className="text-sm">
                  {format(new Date(clinic.updatedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membros
            </CardTitle>
            <CardDescription>Usuários vinculados a esta clínica</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ClinicUsersTable clinicId={id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editar Clínica</CardTitle>
          <CardDescription>
            Atualize as informações da clínica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClinicForm
            clinic={clinic}
            onSubmit={handleSubmit}
            isSubmitting={updateMutation.isPending}
            submitLabel="Salvar Alterações"
          />
        </CardContent>
      </Card>
    </div>
  )
}

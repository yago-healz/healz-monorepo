import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useOrganization, useUpdateOrganization } from '@/features/platform-admin/api/organizations-api'
import { OrganizationForm } from '@/features/platform-admin/components/organizations/organization-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Building2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const Route = createFileRoute('/_authenticated/admin/organizations/$id')({
  component: OrganizationDetailsPage,
})

function OrganizationDetailsPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: organization, isLoading } = useOrganization(id)
  const updateMutation = useUpdateOrganization()

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

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <h2 className="text-2xl font-bold">Organização não encontrada</h2>
        <Button onClick={() => navigate({ to: '/admin/organizations' })}>
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
            onClick={() => navigate({ to: '/admin/organizations' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
              <Badge variant={organization.status === 'active' ? 'default' : 'secondary'}>
                {organization.status === 'active' ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Detalhes e configurações da organização
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">ID</p>
              <p className="text-sm font-mono">{organization.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Slug</p>
              <p className="text-sm font-mono">{organization.slug}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={organization.status === 'active' ? 'default' : 'secondary'}>
                {organization.status === 'active' ? 'Ativa' : 'Inativa'}
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
                {organization.createdAt
                  ? format(new Date(organization.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
                  : 'N/A'}
              </p>
            </div>
            {organization.updatedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Última atualização</p>
                <p className="text-sm">
                  {format(new Date(organization.updatedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Organização</CardTitle>
          <CardDescription>
            Atualize as informações da organização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationForm
            organization={organization}
            onSubmit={handleSubmit}
            isSubmitting={updateMutation.isPending}
            submitLabel="Salvar Alterações"
          />
        </CardContent>
      </Card>
    </div>
  )
}

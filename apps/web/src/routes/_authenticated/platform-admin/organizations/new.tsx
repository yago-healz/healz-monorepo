import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { OrganizationForm } from '@/features/platform-admin/components/organizations/organization-form'
import { useCreateOrganization } from '@/features/platform-admin/api/organizations-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/platform-admin/organizations/new')({
  component: NewOrganizationPage,
})

function NewOrganizationPage() {
  const navigate = useNavigate()
  const createMutation = useCreateOrganization()

  const handleSubmit = async (data: any) => {
    await createMutation.mutateAsync(data)
    navigate({ to: '/platform-admin/organizations' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/platform-admin/organizations' })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Organização</h1>
          <p className="text-muted-foreground">
            Crie uma nova organização no sistema
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Organização</CardTitle>
          <CardDescription>
            Preencha os dados da nova organização. O slug será gerado automaticamente a partir do nome.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationForm
            onSubmit={handleSubmit}
            isSubmitting={createMutation.isPending}
            submitLabel="Criar Organização"
          />
        </CardContent>
      </Card>
    </div>
  )
}

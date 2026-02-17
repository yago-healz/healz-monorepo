import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ClinicForm } from '@/features/platform-admin/components/clinics/clinic-form'
import { useCreateClinic } from '@/features/platform-admin/api/clinics-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/_admin/clinics/new')({
  component: NewClinicPage,
})

function NewClinicPage() {
  const navigate = useNavigate()
  const createMutation = useCreateClinic()

  const handleSubmit = async (data: any) => {
    await createMutation.mutateAsync(data)
    navigate({ to: '/admin/clinics' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/admin/clinics' })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Clínica</h1>
          <p className="text-muted-foreground">
            Crie uma nova clínica vinculada a uma organização
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Clínica</CardTitle>
          <CardDescription>
            Preencha os dados da nova clínica. Selecione a organização à qual ela pertence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClinicForm
            onSubmit={handleSubmit}
            isSubmitting={createMutation.isPending}
            submitLabel="Criar Clínica"
          />
        </CardContent>
      </Card>
    </div>
  )
}

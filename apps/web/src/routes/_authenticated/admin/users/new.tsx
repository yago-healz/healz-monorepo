import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { UserForm } from '@/features/platform-admin/components/users/user-form'
import { useCreateUser } from '@/features/platform-admin/api/users-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/admin/users/new')({
  component: NewUserPage,
})

function NewUserPage() {
  const navigate = useNavigate()
  const createMutation = useCreateUser()

  const handleSubmit = async (data: any) => {
    await createMutation.mutateAsync(data)
    navigate({ to: '/admin/users' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/admin/users' })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Usuário</h1>
          <p className="text-muted-foreground">
            Crie um novo usuário no sistema
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Usuário</CardTitle>
          <CardDescription>
            Preencha os dados do novo usuário. Opcionalmente, você pode vinculá-lo a uma clínica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            onSubmit={handleSubmit}
            isSubmitting={createMutation.isPending}
            submitLabel="Criar Usuário"
          />
        </CardContent>
      </Card>
    </div>
  )
}

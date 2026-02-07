import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useVerifyEmailMutation } from '../api/mutations'

export function VerifyEmail({ token }: { token: string }) {
  const navigate = useNavigate()
  const verifyMutation = useVerifyEmailMutation()

  useEffect(() => {
    verifyMutation.mutate(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verificação de Email</CardTitle>
        <CardDescription>
          {verifyMutation.isPending && 'Verificando seu email...'}
          {verifyMutation.isSuccess && 'Email verificado com sucesso!'}
          {verifyMutation.isError && 'Erro ao verificar email'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {verifyMutation.isPending && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
        {verifyMutation.isSuccess && <CheckCircle className="h-12 w-12 text-green-500" />}
        {verifyMutation.isError && <XCircle className="h-12 w-12 text-red-500" />}

        {verifyMutation.isSuccess && (
          <Button onClick={() => navigate({ to: '/login' })}>
            Ir para Login
          </Button>
        )}
        {verifyMutation.isError && (
          <Button variant="outline" onClick={() => navigate({ to: '/login' })}>
            Voltar para Login
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

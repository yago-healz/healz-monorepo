import { Settings, UserCog, KeyRound, ShieldOff, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  useImpersonateUser,
  useRevokeUserSessions,
  useResetUserPassword,
  useVerifyUserEmail,
} from '@/features/platform-admin/api/users-api'
import type { PlatformUser } from '@/types/api.types'

interface UserAdminActionsProps {
  user: PlatformUser
}

export function UserAdminActions({ user }: UserAdminActionsProps) {
  const impersonate = useImpersonateUser()
  const revokeSessions = useRevokeUserSessions()
  const resetPassword = useResetUserPassword()
  const verifyEmail = useVerifyUserEmail()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Ações Administrativas
        </CardTitle>
        <CardDescription>Ações que afetam diretamente a conta do usuário</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="justify-start gap-2" disabled={impersonate.isPending}>
              <UserCog className="h-4 w-4" />
              Impersonar Usuário
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Entrar como {user.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Você será autenticado como este usuário. Sua sessão atual será preservada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => impersonate.mutate(user.id)}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="justify-start gap-2" disabled={resetPassword.isPending}>
              <KeyRound className="h-4 w-4" />
              Resetar Senha
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resetar senha de {user.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Um email com instruções de redefinição de senha será enviado para {user.email}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => resetPassword.mutate({ id: user.id, sendEmail: true })}>
                Enviar Email
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="justify-start gap-2 text-destructive hover:text-destructive"
              disabled={revokeSessions.isPending}
            >
              <ShieldOff className="h-4 w-4" />
              Revogar Sessões
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revogar todas as sessões?</AlertDialogTitle>
              <AlertDialogDescription>
                {user.name} será deslogado de todos os dispositivos imediatamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => revokeSessions.mutate(user.id)}
              >
                Revogar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {!user.emailVerified && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="justify-start gap-2 text-amber-600 hover:text-amber-600"
                disabled={verifyEmail.isPending}
              >
                <CheckCircle className="h-4 w-4" />
                Verificar Email
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Verificar email manualmente?</AlertDialogTitle>
                <AlertDialogDescription>
                  O email {user.email} será marcado como verificado sem que o usuário precise confirmar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => verifyEmail.mutate(user.id)}>
                  Verificar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

      </CardContent>
    </Card>
  )
}

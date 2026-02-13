# Plano 05 - Painel de Ações Admin na Página de Usuário

**Status:** Pendente
**Arquivo(s) a editar:** `routes/_authenticated/admin/users/$id.tsx`
**Arquivos a criar:** `features/platform-admin/components/users/user-admin-actions.tsx`

## Estado Atual

A página `/admin/users/$id` já tem:
- Info cards (ID, email, status, email verificado, datas)
- `UserClinicsManager` (gerenciar vínculos clínica/role) — já funcional
- Formulário de edição inline

**O que está faltando:** painel de ações administrativas que já existem como mutations nos hooks mas não estão expostas na UI da página de detalhe.

## O Que Implementar

### Componente: `UserAdminActions`

Criar card dedicado com as 4 ações administrativas disponíveis.

**Props:**
```typescript
interface UserAdminActionsProps {
  user: PlatformUser
}
```

**Layout do Card:**

```
┌────────────────────────────────────────────────────┐
│ ⚙️ Ações Administrativas                           │
│ Ações que afetam a conta do usuário                │
├────────────────────────────────────────────────────┤
│ [👤 Impersonar]  Entrar como este usuário          │
│ [🔑 Reset Senha] Enviar email de reset de senha    │
│ [🛡️ Revogar Sessões] Encerrar todas as sessões    │
│ [✉️ Verificar Email]  (só se !emailVerified)       │
└────────────────────────────────────────────────────┘
```

**Implementação:**

```tsx
import { useImpersonateUser, useRevokeUserSessions,
         useResetUserPassword, useVerifyUserEmail } from '@/features/platform-admin/api/users-api'

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

        {/* Impersonar */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="justify-start gap-2">
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

        {/* Reset Senha */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="justify-start gap-2">
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

        {/* Revogar Sessões */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="justify-start gap-2 text-destructive hover:text-destructive">
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
                className="bg-destructive text-destructive-foreground"
                onClick={() => revokeSessions.mutate(user.id)}
              >
                Revogar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Verificar Email (condicional) */}
        {!user.emailVerified && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="justify-start gap-2 text-amber-600 hover:text-amber-600">
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
```

### Integração na Página `$id.tsx`

Adicionar o componente após o `UserClinicsManager` e antes do formulário de edição:

```tsx
import { UserAdminActions } from '@/features/platform-admin/components/users/user-admin-actions'

// No JSX:
<UserClinicsManager user={user} />
<UserAdminActions user={user} />

<Card>  {/* form de edição */}
```

### Status Toggle no Header da Página

Adicionar botão de ativar/desativar no header, usando `useUpdateUserStatus`:

```tsx
const updateStatus = useUpdateUserStatus()

// Desativar: AlertDialog com revokeTokens: true
// Ativar: direto
```

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `features/platform-admin/components/users/user-admin-actions.tsx` | Criar |
| `routes/_authenticated/admin/users/$id.tsx` | Modificar (adicionar UserAdminActions + status toggle no header) |

## Detalhes Técnicos

- Todos os hooks (`useImpersonateUser`, etc.) já existem em `users-api.ts`
- `useImpersonateUser` já redireciona para `/dashboard` automaticamente — não precisa de navegação extra
- `useVerifyUserEmail` invalida a query do usuário — o badge de email verificado atualiza automaticamente
- Ícones: `UserCog`, `KeyRound`, `ShieldOff`, `CheckCircle`, `Settings` do lucide-react

## Resultado Esperado

- Página de usuário tem card dedicado com 4 ações admin
- Todas as ações têm confirmação via AlertDialog
- Verificar email só aparece se email não estiver verificado
- Header tem botão de ativar/desativar o usuário

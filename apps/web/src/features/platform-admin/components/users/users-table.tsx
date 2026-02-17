import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Eye,
  Edit,
  MoreHorizontal,
  UserCog,
  ShieldOff,
  KeyRound,
  CheckCircle,
  BanIcon,
  Mail,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useUsers,
  useImpersonateUser,
  useRevokeUserSessions,
  useResetUserPassword,
  useVerifyUserEmail,
  useResendUserInvite,
  useUpdateUserStatus,
} from '../../api/users-api'
import type { PlatformUser } from '@/types/api.types'

export function UsersTable() {
  const [page] = useState(1)
  const [search, setSearch] = useState('')
  const [statusDialogUser, setStatusDialogUser] = useState<PlatformUser | null>(null)
  const navigate = useNavigate()
  const updateStatus = useUpdateUserStatus()

  const { data, isLoading } = useUsers({
    page,
    limit: 20,
    search,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const impersonateMutation = useImpersonateUser()
  const revokeSessionsMutation = useRevokeUserSessions()
  const resetPasswordMutation = useResetUserPassword()
  const verifyEmailMutation = useVerifyUserEmail()
  const resendInviteMutation = useResendUserInvite()

  const handleImpersonate = (userId: string) => {
    if (confirm('Deseja realmente se passar por este usuário?')) {
      impersonateMutation.mutate(userId)
    }
  }

  const handleRevokeSessions = (userId: string) => {
    if (confirm('Deseja revogar todas as sessões deste usuário?')) {
      revokeSessionsMutation.mutate(userId)
    }
  }

  const handleResetPassword = (userId: string) => {
    if (confirm('Deseja resetar a senha deste usuário e enviar email?')) {
      resetPasswordMutation.mutate({ id: userId, sendEmail: true })
    }
  }

  const handleVerifyEmail = (userId: string) => {
    if (confirm('Deseja verificar manualmente o email deste usuário?')) {
      verifyEmailMutation.mutate(userId)
    }
  }

  const handleResendInvite = (userId: string) => {
    if (confirm('Deseja reenviar o convite para este usuário?')) {
      resendInviteMutation.mutate(userId)
    }
  }

  if (isLoading) {
    return <div>Carregando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar usuários..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Clínicas</TableHead>
              <TableHead>Email Verificado</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((user: PlatformUser) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.clinics[0]?.role || '-'}</Badge>
                </TableCell>
                <TableCell>{user.clinics.length}</TableCell>
                <TableCell>
                  {user.emailVerified ? (
                    <Badge variant="default">Verificado</Badge>
                  ) : (
                    <Badge variant="secondary">Não verificado</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin/users/$id" params={{ id: user.id }}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate({ to: '/admin/users/$id', params: { id: user.id } })}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setStatusDialogUser(user)}
                        className={user.status === 'active' ? 'text-destructive' : 'text-green-600'}
                      >
                        {user.status === 'active' ? (
                          <><BanIcon className="mr-2 h-4 w-4" /> Desativar</>
                        ) : (
                          <><CheckCircle className="mr-2 h-4 w-4" /> Ativar</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Ações Administrativas</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleImpersonate(user.id)}>
                        <UserCog className="mr-2 h-4 w-4" />
                        Impersonar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRevokeSessions(user.id)}>
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Revogar sessões
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Resetar senha
                      </DropdownMenuItem>
                      {!user.emailVerified && (
                        <DropdownMenuItem onClick={() => handleVerifyEmail(user.id)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Verificar email
                        </DropdownMenuItem>
                      )}
                      {!user.passwordHash && !user.emailVerified && (
                        <DropdownMenuItem onClick={() => handleResendInvite(user.id)}>
                          <Mail className="mr-2 h-4 w-4" />
                          Reenviar convite
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* TODO: Add pagination component */}

      <AlertDialog open={!!statusDialogUser} onOpenChange={(open) => !open && setStatusDialogUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusDialogUser?.status === 'active' ? 'Desativar usuário' : 'Ativar usuário'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusDialogUser?.status === 'active'
                ? `Deseja desativar o usuário ${statusDialogUser?.name}? Todas as sessões ativas serão revogadas.`
                : `Deseja reativar o usuário ${statusDialogUser?.name}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!statusDialogUser) return
                const isDeactivating = statusDialogUser.status === 'active'
                updateStatus.mutate({
                  id: statusDialogUser.id,
                  data: {
                    status: isDeactivating ? 'inactive' : 'active',
                    revokeTokens: isDeactivating,
                    ...(isDeactivating && { reason: 'Desativado pelo admin' }),
                  },
                })
                setStatusDialogUser(null)
              }}
              className={statusDialogUser?.status === 'active' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {statusDialogUser?.status === 'active' ? 'Desativar' : 'Ativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

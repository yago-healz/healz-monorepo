import { useUsers } from '@/features/platform-admin/api/users-api'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExternalLink } from 'lucide-react'
import type { PlatformUser } from '@/types/api.types'

interface ClinicUsersTableProps {
  clinicId: string
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  doctor: 'Médico',
  nurse: 'Enfermeiro',
  receptionist: 'Recepcionista',
  patient: 'Paciente',
}

export function ClinicUsersTable({ clinicId }: ClinicUsersTableProps) {
  const { data, isLoading } = useUsers({ clinicId, limit: 50 })
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  const users: PlatformUser[] = data?.data ?? []

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhum usuário vinculado a esta clínica.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Email Verificado</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const clinicRole = user.clinics.find((c) => c.clinicId === clinicId)?.role
          return (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                {clinicRole ? (
                  <Badge variant="outline">{roleLabels[clinicRole] ?? clinicRole}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={user.emailVerified ? 'default' : 'secondary'}>
                  {user.emailVerified ? 'Verificado' : 'Pendente'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                  {user.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate({ to: '/admin/users/$id', params: { id: user.id } })}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useClinicMembers,
  useResendInvite,
  type ClinicMember,
} from '@/features/clinic/api/clinic-members.api'
import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RemoveMemberDialog } from './remove-member-dialog'

function useDebounce<T>(value: T, delay: number): [T] {
  const [debounced, setDebounced] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    timer.current = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer.current)
  }, [value, delay])

  return [debounced]
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Gerente',
  doctor: 'Médico',
  receptionist: 'Recepcionista',
  viewer: 'Visualizador',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function MembersTable() {
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [memberToRemove, setMemberToRemove] = useState<ClinicMember | null>(null)

  const { data, isLoading } = useClinicMembers({ search: debouncedSearch, page, limit: 20 })
  const resendInvite = useResendInvite()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Buscar membros por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NOME</TableHead>
              <TableHead>EMAIL</TableHead>
              <TableHead>CARGO</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead className="w-[50px]">AÇÕES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : (
              data?.data.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{roleLabels[member.role] ?? member.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {member.status === 'active' ? (
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm">Ativo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span className="text-sm">Pendente</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.status === 'pending' && (
                          <DropdownMenuItem
                            onClick={() => resendInvite.mutate(member.email)}
                            disabled={resendInvite.isPending}
                          >
                            Reenviar convite
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setMemberToRemove(member)}
                        >
                          Remover membro
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Mostrando {data?.data.length ?? 0} de {data?.meta.total ?? 0} membros
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm px-2">{page} / {data?.meta.totalPages ?? 1}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= (data?.meta.totalPages ?? 1)}
            >
              Próximo
            </Button>
          </div>
        </div>
      </div>

      <RemoveMemberDialog
        member={memberToRemove}
        open={!!memberToRemove}
        onOpenChange={(open: boolean) => { if (!open) setMemberToRemove(null) }}
      />
    </div>
  )
}

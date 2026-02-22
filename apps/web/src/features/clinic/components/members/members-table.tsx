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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

const mockMembers = [
  { id: '1', name: 'Ana Silva', email: 'ana.silva@clinica.com', role: 'Dono', status: 'active' },
  { id: '2', name: 'Carlos Souza', email: 'c.souza@clinica.com', role: 'Admin', status: 'active' },
  { id: '3', name: 'Mariana Costa', email: 'm.costa@clinica.com', role: 'Colaborador', status: 'pending' },
  { id: '4', name: 'João Paulo', email: 'jp@clinica.com', role: 'Colaborador', status: 'active' },
]

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

  const filtered = mockMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  )

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
            {filtered.map((member) => (
              <TableRow key={member.id}>
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
                  <Badge variant="outline">{member.role}</Badge>
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
                      <DropdownMenuItem>Editar cargo</DropdownMenuItem>
                      <DropdownMenuItem>Reenviar convite</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Remover membro
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Mostrando 1-4 de 24 membros
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((page) => (
              <Button
                key={page}
                variant={page === 1 ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
              >
                {page}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

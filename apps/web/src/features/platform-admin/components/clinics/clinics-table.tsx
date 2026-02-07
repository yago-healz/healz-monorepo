import { useState } from 'react'
import { Link } from '@tanstack/react-router'
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
import { Eye, Edit, MoreHorizontal, ArrowRightLeft } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useClinics } from '../../api/clinics-api'
import type { Clinic } from '@/types/api.types'

export function ClinicsTable() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useClinics({
    page,
    limit: 20,
    search,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  if (isLoading) {
    return <div>Carregando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar clínicas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button asChild>
          <Link to="/platform-admin/clinics/new">
            Nova Clínica
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Organização</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((clinic: Clinic) => (
              <TableRow key={clinic.id}>
                <TableCell className="font-medium">{clinic.name}</TableCell>
                <TableCell>{clinic.organization?.name || '-'}</TableCell>
                <TableCell>{clinic.city}</TableCell>
                <TableCell>{clinic.state}</TableCell>
                <TableCell>{clinic.usersCount || 0}</TableCell>
                <TableCell>
                  <Badge variant={clinic.status === 'active' ? 'default' : 'secondary'}>
                    {clinic.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(clinic.createdAt).toLocaleDateString('pt-BR')}
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
                        <Link to={`/platform-admin/clinics/${clinic.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Transferir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* TODO: Add pagination component */}
    </div>
  )
}

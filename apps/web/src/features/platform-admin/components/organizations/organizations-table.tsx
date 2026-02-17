import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import type { Organization } from '@/types/api.types'
import { Link, useNavigate } from '@tanstack/react-router'
import { BanIcon, CheckCircle, Edit, Eye, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useOrganizations, useUpdateOrganizationStatus } from '../../api/organizations-api'

export function OrganizationsTable() {
  const [page] = useState(1)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const updateStatus = useUpdateOrganizationStatus()

  const { data, isLoading } = useOrganizations({
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
          placeholder="Buscar organizações..."
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
              <TableHead>Slug</TableHead>
              <TableHead>Clínicas</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((org: Organization) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>{org.slug}</TableCell>
                <TableCell>{org.stats.clinicsCount || 0}</TableCell>
                <TableCell>{org.stats.usersCount || 0}</TableCell>
                <TableCell>
                  <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                    {org.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(org.createdAt).toLocaleDateString('pt-BR')}
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
                        <Link to="/admin/organizations/$id" params={{ id: org.id }}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate({ to: '/admin/organizations/$id', params: { id: org.id } })}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => updateStatus.mutate({ id: org.id, data: { status: org.status === 'active' ? 'inactive' : 'active' } })}
                        className={org.status === 'active' ? 'text-destructive' : 'text-green-600'}
                      >
                        {org.status === 'active' ? (
                          <><BanIcon className="mr-2 h-4 w-4" /> Desativar</>
                        ) : (
                          <><CheckCircle className="mr-2 h-4 w-4" /> Ativar</>
                        )}
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

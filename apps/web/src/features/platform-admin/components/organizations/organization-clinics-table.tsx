import { useNavigate } from '@tanstack/react-router'
import { useClinics } from '@/features/platform-admin/api/clinics-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface OrganizationClinicsTableProps {
  organizationId: string
}

export function OrganizationClinicsTable({ organizationId }: OrganizationClinicsTableProps) {
  const navigate = useNavigate()
  const { data, isLoading } = useClinics({ organizationId, limit: 50 })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  const clinics = data?.data ?? []

  if (clinics.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhuma clínica vinculada a esta organização.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Criada em</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clinics.map((clinic) => (
          <TableRow key={clinic.id}>
            <TableCell className="font-medium">{clinic.name}</TableCell>
            <TableCell>
              <Badge variant={clinic.status === 'active' ? 'default' : 'secondary'}>
                {clinic.status === 'active' ? 'Ativa' : 'Inativa'}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {clinic.createdAt
                ? format(new Date(clinic.createdAt), "dd/MM/yyyy", { locale: ptBR })
                : 'N/A'}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: '/admin/clinics/$id', params: { id: clinic.id } })}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

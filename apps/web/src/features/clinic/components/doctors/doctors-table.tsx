import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MoreHorizontal } from 'lucide-react'
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
import { useDoctors, useDeactivateDoctor } from '@/features/clinic/api/doctors.api'
import type { DoctorProfile } from '@/types/doctor.types'

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function matchesSearch(doctor: DoctorProfile, search: string) {
  const q = search.toLowerCase()
  return (
    doctor.name.toLowerCase().includes(q) ||
    (doctor.crm?.toLowerCase().includes(q) ?? false) ||
    (doctor.specialty?.toLowerCase().includes(q) ?? false)
  )
}

export function DoctorsTable() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { data: doctors, isLoading } = useDoctors()
  const deactivate = useDeactivateDoctor()

  const filtered = doctors?.filter((d) => !search || matchesSearch(d, search)) ?? []

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nome, CRM ou especialidade..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NOME</TableHead>
              <TableHead>CRM</TableHead>
              <TableHead>ESPECIALIDADE</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead className="w-[50px]">AÇÕES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {search ? 'Nenhum médico encontrado para esta busca.' : 'Nenhum médico cadastrado.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((doctor) => (
                <TableRow
                  key={doctor.id}
                  className="cursor-pointer"
                  onClick={() => navigate({ to: '/clinic/doctors/$doctorId', params: { doctorId: doctor.id } })}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(doctor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{doctor.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{doctor.crm ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{doctor.specialty ?? '—'}</TableCell>
                  <TableCell>
                    {doctor.doctorClinic.isActive ? (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate({ to: '/clinic/doctors/$doctorId', params: { doctorId: doctor.id } })
                          }}
                        >
                          Ver detalhes
                        </DropdownMenuItem>
                        {doctor.doctorClinic.isActive && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              deactivate.mutate(doctor.id)
                            }}
                            disabled={deactivate.isPending}
                          >
                            Desativar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!isLoading && filtered.length > 0 && (
          <div className="border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {filtered.length} médico{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

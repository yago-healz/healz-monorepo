import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  useAddUserToClinic,
  useUpdateUserClinicRole,
  useRemoveUserFromClinic,
} from '../../api/users-api'
import { useClinics } from '../../api/clinics-api'
import { Loader2, Plus, MoreHorizontal, Trash2, Edit } from 'lucide-react'
import type { PlatformUser } from '@/types/api.types'

const addClinicSchema = z.object({
  clinicId: z.string().uuid('Selecione uma clínica'),
  role: z.enum(['admin', 'doctor', 'receptionist']),
})

type AddClinicFormValues = z.infer<typeof addClinicSchema>

interface UserClinicsManagerProps {
  user: PlatformUser
}

export function UserClinicsManager({ user }: UserClinicsManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [clinicToRemove, setClinicToRemove] = useState<string | null>(null)

  const addMutation = useAddUserToClinic()
  const updateRoleMutation = useUpdateUserClinicRole()
  const removeMutation = useRemoveUserFromClinic()

  const { data: clinicsData } = useClinics({
    page: 1,
    limit: 100,
    status: 'active',
    sortBy: 'name',
    sortOrder: 'asc',
  })

  const form = useForm<AddClinicFormValues>({
    resolver: zodResolver(addClinicSchema),
    defaultValues: {
      clinicId: '',
      role: 'doctor',
    },
  })

  const handleAddClinic = async (data: AddClinicFormValues) => {
    await addMutation.mutateAsync({
      userId: user.id,
      data: {
        clinicId: data.clinicId,
        role: data.role,
      },
    })
    setAddDialogOpen(false)
    form.reset()
  }

  const handleUpdateRole = async (clinicId: string, newRole: 'admin' | 'doctor' | 'receptionist') => {
    await updateRoleMutation.mutateAsync({
      userId: user.id,
      clinicId,
      data: { role: newRole },
    })
  }

  const handleRemoveClinic = async () => {
    if (!clinicToRemove) return
    await removeMutation.mutateAsync({
      userId: user.id,
      clinicId: clinicToRemove,
    })
    setRemoveDialogOpen(false)
    setClinicToRemove(null)
  }

  const userClinicIds = user.clinics?.map((c) => c.clinicId) || []
  const availableClinics =
    clinicsData?.data.filter((c) => !userClinicIds.includes(c.id)) || []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Clínicas do Usuário</CardTitle>
            <CardDescription>
              Gerencie as clínicas e roles deste usuário
            </CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar à Clínica
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar à Clínica</DialogTitle>
                <DialogDescription>
                  Vincule o usuário a uma clínica com uma role específica
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddClinic)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="clinicId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clínica</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a clínica" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableClinics.map((clinic) => (
                              <SelectItem key={clinic.id} value={clinic.id}>
                                {clinic.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="doctor">Médico</SelectItem>
                            <SelectItem value="receptionist">Secretário</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={addMutation.isPending}>
                      {addMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Adicionar
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!user.clinics || user.clinics.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Este usuário não está vinculado a nenhuma clínica
          </div>
        ) : (
          <div className="space-y-2">
            {user.clinics.map((clinic) => (
              <div
                key={clinic.clinicId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{clinic.clinicName}</p>
                  <p className="text-sm text-muted-foreground">
                    {clinic.organizationName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{clinic.role}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(clinic.clinicId, 'admin')}
                        disabled={clinic.role === 'admin' || updateRoleMutation.isPending}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Alterar para Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(clinic.clinicId, 'doctor')}
                        disabled={clinic.role === 'doctor' || updateRoleMutation.isPending}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Alterar para Médico
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(clinic.clinicId, 'receptionist')}
                        disabled={clinic.role === 'receptionist' || updateRoleMutation.isPending}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Alterar para Secretário
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setClinicToRemove(clinic.clinicId)
                          setRemoveDialogOpen(true)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover da Clínica
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover da Clínica</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este usuário da clínica? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveClinic}
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

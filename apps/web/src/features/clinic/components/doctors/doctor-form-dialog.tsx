import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateDoctor } from '@/features/clinic/api/doctors.api'
import { useClinicMembers } from '@/features/clinic/api/clinic-members.api'

const schema = z.object({
  userId: z.string().min(1, 'Selecione um usuário'),
  crm: z.string().max(50).optional(),
  specialty: z.string().max(100).optional(),
  bio: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface DoctorFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DoctorFormDialog({ open, onOpenChange }: DoctorFormDialogProps) {
  const createDoctor = useCreateDoctor()
  const { data: membersData } = useClinicMembers({ limit: 100 })

  const doctorMembers = membersData?.data.filter((m) => m.role === 'doctor') ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userId: '', crm: '', specialty: '', bio: '' },
  })

  function handleSubmit(values: FormValues) {
    const dto = {
      userId: values.userId,
      ...(values.crm ? { crm: values.crm } : {}),
      ...(values.specialty ? { specialty: values.specialty } : {}),
      ...(values.bio ? { bio: values.bio } : {}),
    }

    createDoctor.mutate(dto, {
      onSuccess: () => {
        form.reset()
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Médico</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Usuário *</Label>
            <Select onValueChange={(v) => form.setValue('userId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário médico" />
              </SelectTrigger>
              <SelectContent>
                {doctorMembers.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    Nenhum usuário com cargo médico
                  </SelectItem>
                ) : (
                  doctorMembers.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name} ({m.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.userId && (
              <p className="text-sm text-destructive">{form.formState.errors.userId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>CRM</Label>
            <Input {...form.register('crm')} placeholder="Ex: 123456/SP" />
            {form.formState.errors.crm && (
              <p className="text-sm text-destructive">{form.formState.errors.crm.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Especialidade</Label>
            <Input {...form.register('specialty')} placeholder="Ex: Cardiologia" />
            {form.formState.errors.specialty && (
              <p className="text-sm text-destructive">{form.formState.errors.specialty.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Bio</Label>
            <Textarea
              {...form.register('bio')}
              placeholder="Descrição breve do médico..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createDoctor.isPending}>
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

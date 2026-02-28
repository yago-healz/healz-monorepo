import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useAddExistingMember,
  useInviteNewMember,
} from '@/features/clinic/api/clinic-members.api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Gerente' },
  { value: 'doctor', label: 'Médico' },
  { value: 'receptionist', label: 'Recepcionista' },
  { value: 'viewer', label: 'Visualizador' },
]

const roleEnum = z.enum(['admin', 'manager', 'doctor', 'receptionist', 'viewer'])

const newUserSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  role: roleEnum,
})

const existingUserSchema = z.object({
  email: z.string().email('Email inválido'),
  role: roleEnum,
})

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const inviteNew = useInviteNewMember()
  const addExisting = useAddExistingMember()

  const newForm = useForm<z.infer<typeof newUserSchema>>({
    resolver: zodResolver(newUserSchema),
  })
  const existingForm = useForm<z.infer<typeof existingUserSchema>>({
    resolver: zodResolver(existingUserSchema),
  })

  function handleInviteNew(values: z.infer<typeof newUserSchema>) {
    inviteNew.mutate(values, {
      onSuccess: () => {
        newForm.reset()
        onOpenChange(false)
      },
    })
  }

  function handleAddExisting(values: z.infer<typeof existingUserSchema>) {
    addExisting.mutate(
      { userId: values.email, role: values.role },
      {
        onSuccess: () => {
          existingForm.reset()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="new">
          <TabsList className="w-full">
            <TabsTrigger value="new" className="flex-1">Novo usuário</TabsTrigger>
            <TabsTrigger value="existing" className="flex-1">Já tem conta</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 pt-2">
            <form onSubmit={newForm.handleSubmit(handleInviteNew)} className="space-y-4">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input {...newForm.register('name')} placeholder="Nome completo" />
                {newForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{newForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input {...newForm.register('email')} type="email" placeholder="email@clinica.com" />
                {newForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{newForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Cargo *</Label>
                <Select onValueChange={(v) => newForm.setValue('role', v as z.infer<typeof roleEnum>)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newForm.formState.errors.role && (
                  <p className="text-sm text-destructive">{newForm.formState.errors.role.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={inviteNew.isPending}>
                Enviar convite
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 pt-2">
            <form onSubmit={existingForm.handleSubmit(handleAddExisting)} className="space-y-4">
              <div className="space-y-1">
                <Label>Email do usuário *</Label>
                <Input {...existingForm.register('email')} type="email" placeholder="email@clinica.com" />
                {existingForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{existingForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Cargo *</Label>
                <Select onValueChange={(v) => existingForm.setValue('role', v as z.infer<typeof roleEnum>)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {existingForm.formState.errors.role && (
                  <p className="text-sm text-destructive">{existingForm.formState.errors.role.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={addExisting.isPending}>
                Adicionar membro
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { useClinics } from '../../api/clinics-api'
import { Skeleton } from '@/components/ui/skeleton'
import type { PlatformUser } from '@/types/api.types'

const userSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  sendInvite: z.boolean(),
  password: z.string().optional().or(z.literal('')),
  clinicId: z.string().optional().or(z.literal('')),
  role: z.enum(['admin', 'doctor', 'secretary']).optional(),
})

type UserFormValues = z.infer<typeof userSchema>

interface UserFormProps {
  user?: PlatformUser
  onSubmit: (data: UserFormValues) => Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
}

export function UserForm({
  user,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Salvar',
}: UserFormProps) {
  const { data: clinicsData, isLoading: isLoadingClinics } = useClinics({
    page: 1,
    limit: 100,
    status: 'active',
    sortBy: 'name',
    sortOrder: 'asc',
  })

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      sendInvite: true,
      password: '',
      clinicId: '',
      role: undefined,
    },
  })

  const sendInvite = form.watch('sendInvite')
  const showClinicFields = form.watch('clinicId')

  const handleSubmit = async (data: UserFormValues) => {
    if (!data.sendInvite && (!data.password || data.password.length < 6)) {
      form.setError('password', {
        message: 'Senha obrigatória (mínimo 6 caracteres) quando não enviar convite',
      })
      return
    }
    await onSubmit(data)
  }

  if (isLoadingClinics) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Ex: João Silva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="joao@exemplo.com"
                  {...field}
                  disabled={!!user}
                />
              </FormControl>
              {user && (
                <FormDescription>
                  O email não pode ser alterado após a criação
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {!user && (
          <FormField
            control={form.control}
            name="sendInvite"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Enviar convite por email</FormLabel>
                  <FormDescription>
                    O usuário receberá um email para definir sua senha. Desative para definir a senha agora.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {!sendInvite && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{user ? 'Nova Senha (opcional)' : 'Senha'}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={user ? 'Deixe vazio para manter a senha atual' : 'Mínimo 6 caracteres'}
                    {...field}
                  />
                </FormControl>
                {user && (
                  <FormDescription>
                    Preencha apenas se deseja alterar a senha
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {!user && (
          <>
            <FormField
              control={form.control}
              name="clinicId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clínica (Opcional)</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
                    defaultValue={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma clínica" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {clinicsData?.data.map((clinic) => (
                        <SelectItem key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Se selecionada, o usuário será automaticamente adicionado a esta clínica
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showClinicFields && (
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role na Clínica</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="doctor">Médico</SelectItem>
                        <SelectItem value="secretary">Secretário</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Permissões do usuário nesta clínica
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}

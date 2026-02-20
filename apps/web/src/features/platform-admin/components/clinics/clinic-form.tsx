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
import { Loader2 } from 'lucide-react'
import { useOrganizations } from '../../api/organizations-api'
import { UserSearchCombobox } from '../users/user-search-combobox'
import { Skeleton } from '@/components/ui/skeleton'
import type { Clinic } from '@/types/api.types'

const clinicSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  organizationId: z.string().uuid('Selecione uma organização'),
  status: z.enum(['active', 'inactive']),
  initialAdminId: z.string().uuid().optional(),
})

type ClinicFormValues = z.infer<typeof clinicSchema>

interface ClinicFormProps {
  clinic?: Clinic
  onSubmit: (data: ClinicFormValues) => Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
}

export function ClinicForm({
  clinic,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Salvar',
}: ClinicFormProps) {
  const { data: orgsData, isLoading: isLoadingOrgs } = useOrganizations({
    page: 1,
    limit: 100,
    status: 'active',
    sortBy: 'name',
    sortOrder: 'asc',
  })

  const form = useForm<ClinicFormValues>({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      name: clinic?.name || '',
      organizationId: clinic?.organizationId || '',
      status: clinic?.status || 'active',
      initialAdminId: '',
    },
  })

  if (isLoadingOrgs) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  const handleFormSubmit = (values: ClinicFormValues) => {
    const payload = { ...values }
    if (!payload.initialAdminId) delete payload.initialAdminId
    return onSubmit(payload)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Clínica</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Clínica Centro" {...field} />
              </FormControl>
              <FormDescription>
                Nome da clínica como aparecerá no sistema
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="organizationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organização</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!!clinic}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a organização" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {orgsData?.data.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {clinic
                  ? 'A organização não pode ser alterada. Use "Transferir Clínica" se necessário.'
                  : 'Selecione a organização à qual esta clínica pertence'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Clínicas inativas não podem ser acessadas pelos usuários
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {!clinic && (
          <FormField
            control={form.control}
            name="initialAdminId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Admin Inicial (Opcional)</FormLabel>
                <FormControl>
                  <UserSearchCombobox
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  Se fornecido, este usuário será automaticamente adicionado como admin da clínica
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
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

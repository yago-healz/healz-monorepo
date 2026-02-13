import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
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
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import type { Organization } from '@/types/api.types'

const baseSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  slug: z
    .string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  status: z.enum(['active', 'inactive']),
})

const createSchema = baseSchema.extend({
  initialClinic: z.object({
    name: z.string().min(3, 'Nome da clínica deve ter no mínimo 3 caracteres'),
  }),
  initialAdmin: z.object({
    name: z.string().min(3, 'Nome do admin deve ter no mínimo 3 caracteres'),
    email: z.string().email('Email inválido'),
    sendInvite: z.boolean().default(true),
  }),
})

type EditFormValues = z.infer<typeof baseSchema>
type CreateFormValues = z.infer<typeof createSchema>
type OrganizationFormValues = EditFormValues | CreateFormValues

interface OrganizationFormProps {
  organization?: Organization
  onSubmit: (data: OrganizationFormValues) => Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
}

export function OrganizationForm({
  organization,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Salvar',
}: OrganizationFormProps) {
  const isCreate = !organization

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(isCreate ? createSchema : baseSchema) as unknown as Resolver<CreateFormValues>,
    defaultValues: isCreate
      ? {
          name: '',
          slug: '',
          status: 'active',
          initialClinic: { name: '' },
          initialAdmin: { name: '', email: '', sendInvite: true },
        }
      : {
          name: organization.name,
          slug: organization.slug,
          status: organization.status,
        },
  })

  const handleNameChange = (value: string) => {
    if (isCreate) {
      const slug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      form.setValue('slug', slug)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => onSubmit(data))} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Organização</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Clínica São Paulo"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e)
                    handleNameChange(e.target.value)
                  }}
                />
              </FormControl>
              <FormDescription>
                Nome completo da organização como aparecerá no sistema
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug (Identificador único)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: clinica-sao-paulo"
                  {...field}
                  disabled={!!organization}
                />
              </FormControl>
              <FormDescription>
                {organization
                  ? 'O slug não pode ser alterado após a criação'
                  : 'Identificador único da organização na URL. Gerado automaticamente do nome.'}
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
                Organizações inativas não podem criar novas clínicas
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {isCreate && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Clínica Inicial</h3>
              <FormField
                control={form.control}
                name="initialClinic.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Clínica</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Unidade Centro" {...field} />
                    </FormControl>
                    <FormDescription>
                      Toda organização precisa de ao menos uma clínica
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Admin Inicial</h3>
              <FormField
                control={form.control}
                name="initialAdmin.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Admin</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialAdmin.email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do Admin</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialAdmin.sendInvite"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Enviar convite por email</FormLabel>
                      <FormDescription>
                        O admin receberá um email para definir sua senha
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
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

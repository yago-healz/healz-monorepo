import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  useClinicGeneral,
  useSaveClinicGeneral,
} from '@/features/clinic/api/clinic-settings.api'
import { useCepLookup } from '@/hooks/use-cep-lookup'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  return digits
}

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  description: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export function GeneralTab() {
  const { data, isLoading } = useClinicGeneral()
  const { mutate: save, isPending } = useSaveClinicGeneral()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
    },
  })

  const zipCodeValue = form.watch('zipCode')
  const { isLoading: isCepLoading, address: cepAddress, error: cepError } = useCepLookup(zipCodeValue ?? '')

  // Preencher formulário quando dados chegam
  useEffect(() => {
    if (data) {
      form.reset({
        name: data.name ?? '',
        description: data.description ?? '',
        street: data.address?.street ?? '',
        number: data.address?.number ?? '',
        complement: data.address?.complement ?? '',
        neighborhood: data.address?.neighborhood ?? '',
        city: data.address?.city ?? '',
        state: data.address?.state ?? '',
        zipCode: data.address?.zipCode ?? '',
      })
    }
  }, [data, form])

  // Auto-preencher campos de endereço quando CEP for encontrado
  useEffect(() => {
    if (cepAddress) {
      form.setValue('street', cepAddress.street, { shouldDirty: true })
      form.setValue('neighborhood', cepAddress.neighborhood, { shouldDirty: true })
      form.setValue('city', cepAddress.city, { shouldDirty: true })
      form.setValue('state', cepAddress.state, { shouldDirty: true })
    }
  }, [cepAddress, form])

  function onSubmit(values: FormValues) {
    const hasAddress =
      values.street || values.city || values.state || values.zipCode

    save({
      name: values.name,
      description: values.description || undefined,
      address: hasAddress
        ? {
          street: values.street!,
          number: values.number!,
          complement: values.complement || undefined,
          neighborhood: values.neighborhood || undefined,
          city: values.city!,
          state: values.state!,
          zipCode: values.zipCode!,
        }
        : undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Seção: Informações Gerais */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Informações Gerais</h2>
          <p className="text-sm text-muted-foreground">
            Nome e descrição visíveis na plataforma.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nome da clínica</Label>
          <Input id="name" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            rows={3}
            placeholder="Descreva brevemente a clínica..."
            {...form.register('description')}
          />
        </div>
      </div>

      <Separator />

      {/* Seção: Endereço */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Endereço</h2>
          <p className="text-sm text-muted-foreground">
            Localização física da clínica.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="zipCode">CEP</Label>
            <div className="relative">
              <Input
                id="zipCode"
                placeholder="00000-000"
                {...form.register('zipCode')}
                onChange={(e) => {
                  const formatted = formatCep(e.target.value)
                  form.setValue('zipCode', formatted, { shouldValidate: true })
                }}
              />
              {isCepLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {cepError && (
              <p className="text-sm text-destructive">{cepError}</p>
            )}
            {form.formState.errors.zipCode && (
              <p className="text-sm text-destructive">
                {form.formState.errors.zipCode.message}
              </p>
            )}
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="street">Logradouro</Label>
            <Input id="street" placeholder="Rua, Avenida..." {...form.register('street')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="number">Número</Label>
            <Input id="number" {...form.register('number')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="complement">Complemento</Label>
            <Input id="complement" placeholder="Sala, Andar..." {...form.register('complement')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input id="neighborhood" {...form.register('neighborhood')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" {...form.register('city')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">Estado (UF)</Label>
            <Input id="state" placeholder="SP" maxLength={2} {...form.register('state')} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreditCard, Pencil, Trash2, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { tokenService } from '@/services/token.service'
import { SettingsLoading } from './settings-loading'
import {
  usePaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeactivatePaymentMethod,
} from '@/features/clinic/api/payment-methods.api'
import type { PaymentMethod, PaymentMethodType } from '@/types/payment-method.types'

const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  insurance: 'Convênio',
  bank_transfer: 'Transferência Bancária',
}

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  type: z.enum(['pix', 'credit_card', 'debit_card', 'cash', 'insurance', 'bank_transfer'] as const),
  instructions: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function PaymentMethodsTab() {
  const clinicId = tokenService.getUser()?.activeClinic?.id ?? ''
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  const { data: paymentMethods = [], isLoading } = usePaymentMethods(clinicId)
  const { mutate: createMethod, isPending: isCreating } = useCreatePaymentMethod()
  const { mutate: updateMethod, isPending: isUpdating } = useUpdatePaymentMethod()
  const { mutate: deactivateMethod, isPending: isDeactivating } = useDeactivatePaymentMethod()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', type: 'pix', instructions: '' },
  })

  function openCreate() {
    form.reset({ name: '', type: 'pix', instructions: '' })
    setEditingMethod(null)
    setDialogOpen(true)
  }

  function openEdit(method: PaymentMethod) {
    form.reset({
      name: method.name,
      type: method.type,
      instructions: method.instructions ?? '',
    })
    setEditingMethod(method)
    setDialogOpen(true)
  }

  function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      type: values.type,
      instructions: values.instructions || undefined,
    }

    if (editingMethod) {
      updateMethod(
        { id: editingMethod.id, data: payload },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      createMethod(payload, { onSuccess: () => setDialogOpen(false) })
    }
  }

  function handleDeactivate() {
    if (!deactivatingId) return
    deactivateMethod(deactivatingId, { onSuccess: () => setDeactivatingId(null) })
  }

  if (isLoading) {
    return <SettingsLoading />
  }

  const activePaymentMethods = paymentMethods.filter((m) => m.isActive)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Formas de Pagamento</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as formas de pagamento aceitas pela clínica
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {activePaymentMethods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Nenhuma forma de pagamento cadastrada
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar forma de pagamento
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {activePaymentMethods.map((method) => (
                <li key={method.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{method.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {PAYMENT_METHOD_LABELS[method.type]}
                        </Badge>
                      </div>
                      {method.instructions && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">
                          {method.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(method)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeactivatingId(method.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: PIX Empresarial" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethodType, string][]).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instruções (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Chave PIX: contato@clinica.com.br"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {(isCreating || isUpdating) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingMethod ? 'Salvar alterações' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog
        open={!!deactivatingId}
        onOpenChange={(open) => !open && setDeactivatingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar forma de pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá desativar a forma de pagamento. Ela não será mais exibida aos
              pacientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isDeactivating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

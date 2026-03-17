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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  useCreateEscalationTrigger,
  useDeleteEscalationTrigger,
  useEscalationTriggers,
  useUpdateEscalationTrigger,
} from '../../api/escalation-triggers.api'
import type { ConditionType, EscalationTrigger } from '../../types/escalation-trigger.types'

const CONDITION_TYPE_LABELS: Record<ConditionType, string> = {
  out_of_scope: 'Pergunta fora do escopo',
  keyword_detected: 'Palavra-chave detectada',
  max_attempts_exceeded: 'Tentativas excedidas',
  explicit_request: 'Pedido explícito de humano',
  custom: 'Condição personalizada',
}

const schema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  conditionType: z.enum([
    'out_of_scope',
    'keyword_detected',
    'max_attempts_exceeded',
    'explicit_request',
    'custom',
  ]),
  conditionParams: z
    .object({
      keywords: z.array(z.string()).optional(),
      maxAttempts: z.number().int().min(1).optional(),
      prompt: z.string().optional(),
    })
    .optional(),
})

type FormValues = z.infer<typeof schema>

interface TriggerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: EscalationTrigger
}

function TriggerFormDialog({ open, onOpenChange, trigger }: TriggerFormDialogProps) {
  const { mutate: create, isPending: isCreating } = useCreateEscalationTrigger()
  const { mutate: update, isPending: isUpdating } = useUpdateEscalationTrigger()
  const isPending = isCreating || isUpdating

  const [keywordsInput, setKeywordsInput] = useState(
    () => (trigger?.conditionParams?.keywords as string[] | undefined)?.join(', ') ?? '',
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: trigger
      ? {
          name: trigger.name,
          description: trigger.description ?? '',
          conditionType: trigger.conditionType as ConditionType,
          conditionParams: trigger.conditionParams as FormValues['conditionParams'],
        }
      : {
          name: '',
          description: '',
          conditionType: 'out_of_scope',
          conditionParams: undefined,
        },
  })

  const conditionType = form.watch('conditionType')

  function onSubmit(values: FormValues) {
    const params = buildConditionParams(values, keywordsInput)

    if (trigger) {
      update(
        { triggerId: trigger.id, data: { ...values, conditionParams: params } },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      create(
        { ...values, conditionParams: params },
        { onSuccess: () => { onOpenChange(false); form.reset() } },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{trigger ? 'Editar Regra' : 'Adicionar Regra'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" rows={2} {...form.register('description')} />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de condição *</Label>
            <Controller
              control={form.control}
              name="conditionType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {conditionType === 'keyword_detected' && (
            <div className="space-y-1.5">
              <Label htmlFor="keywords">Palavras-chave (separe por vírgula)</Label>
              <Input
                id="keywords"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="ex: cancelar, reembolso, falar com humano"
              />
            </div>
          )}

          {conditionType === 'max_attempts_exceeded' && (
            <div className="space-y-1.5">
              <Label htmlFor="maxAttempts">Número máximo de tentativas</Label>
              <Controller
                control={form.control}
                name="conditionParams.maxAttempts"
                render={({ field }) => (
                  <Input
                    id="maxAttempts"
                    type="number"
                    min={1}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                )}
              />
            </div>
          )}

          {conditionType === 'custom' && (
            <div className="space-y-1.5">
              <Label htmlFor="prompt">Descreva a condição</Label>
              <Textarea
                id="prompt"
                rows={3}
                {...form.register('conditionParams.prompt')}
                placeholder="ex: quando o paciente mencionar dor aguda ou emergência"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function buildConditionParams(
  values: FormValues,
  keywordsInput: string,
): Record<string, unknown> | undefined {
  if (values.conditionType === 'keyword_detected') {
    const keywords = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
    return keywords.length > 0 ? { keywords } : undefined
  }
  if (values.conditionType === 'max_attempts_exceeded') {
    const max = values.conditionParams?.maxAttempts
    return max !== undefined ? { maxAttempts: max } : undefined
  }
  if (values.conditionType === 'custom') {
    const prompt = values.conditionParams?.prompt
    return prompt ? { prompt } : undefined
  }
  return undefined
}

interface TriggerCardProps {
  trigger: EscalationTrigger
}

function TriggerCard({ trigger }: TriggerCardProps) {
  const { mutate: update } = useUpdateEscalationTrigger()
  const { mutate: remove, isPending: isDeleting } = useDeleteEscalationTrigger()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <Card>
        <CardContent className="flex items-start justify-between gap-4 pt-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{trigger.name}</span>
              <Badge variant="secondary" className="text-xs">
                {CONDITION_TYPE_LABELS[trigger.conditionType as ConditionType] ?? trigger.conditionType}
              </Badge>
            </div>
            {trigger.description && (
              <p className="text-sm text-muted-foreground">{trigger.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={trigger.isActive}
              onCheckedChange={(checked) =>
                update({ triggerId: trigger.id, data: { isActive: checked } })
              }
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteOpen(true)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <TriggerFormDialog open={editOpen} onOpenChange={setEditOpen} trigger={trigger} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a regra "{trigger.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove(trigger.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function EscalationTriggersSubtab() {
  const { data: triggers = [], isLoading } = useEscalationTriggers()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Regras de Encaminhamento</h3>
          <p className="text-sm text-muted-foreground">
            Configure quando a Carol deve pausar e transferir o atendimento para um humano.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Regra
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : triggers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm font-medium">Nenhuma regra configurada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione regras para definir quando a Carol deve transferir o atendimento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {triggers.map((trigger) => (
            <TriggerCard key={trigger.id} trigger={trigger} />
          ))}
        </div>
      )}

      <TriggerFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

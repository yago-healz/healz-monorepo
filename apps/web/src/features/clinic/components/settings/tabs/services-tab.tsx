import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Briefcase, Pencil, Trash2, Loader2 } from 'lucide-react'
import { SettingsLoading } from './settings-loading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  useProcedures,
  useCreateProcedure,
  useUpdateProcedure,
  useDeactivateProcedure,
} from '@/features/clinic/api/procedures.api'
import { tokenService } from '@/services/token.service'
import type { Procedure } from '@/types/procedure.types'

const CATEGORY_SUGGESTIONS = ['Consulta', 'Estético', 'Exame', 'Cirúrgico']

const procedureSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  defaultDuration: z.coerce
    .number({ invalid_type_error: 'Informe a duração' })
    .min(5, 'Mínimo 5 minutos')
    .max(480, 'Máximo 480 minutos'),
})

type ProcedureFormValues = z.infer<typeof procedureSchema>

interface ProcedureFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  procedure?: Procedure
  clinicId: string
}

function ProcedureFormDialog({ open, onOpenChange, procedure, clinicId }: ProcedureFormDialogProps) {
  const isEditing = !!procedure
  const createProcedure = useCreateProcedure(clinicId)
  const updateProcedure = useUpdateProcedure(clinicId)

  const form = useForm<ProcedureFormValues>({
    resolver: zodResolver(procedureSchema),
    defaultValues: {
      name: procedure?.name ?? '',
      description: procedure?.description ?? '',
      category: procedure?.category ?? '',
      defaultDuration: procedure?.defaultDuration ?? 30,
    },
  })

  function onSubmit(values: ProcedureFormValues) {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      category: values.category || undefined,
      defaultDuration: values.defaultDuration,
    }

    if (isEditing) {
      updateProcedure.mutate(
        { id: procedure.id, data: payload },
        { onSuccess: () => { onOpenChange(false); form.reset() } },
      )
    } else {
      createProcedure.mutate(payload, {
        onSuccess: () => { onOpenChange(false); form.reset() },
      })
    }
  }

  const isPending = createProcedure.isPending || updateProcedure.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isPending) { onOpenChange(v); form.reset() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar procedimento' : 'Novo procedimento'}</DialogTitle>
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
                    <Input placeholder="Ex: Consulta inicial" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria <span className="text-muted-foreground">(opcional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Consulta, Estético..." list="category-suggestions" {...field} />
                  </FormControl>
                  <datalist id="category-suggestions">
                    {CATEGORY_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração padrão</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a duração" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="20">20 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                      <SelectItem value="120">120 min</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição <span className="text-muted-foreground">(opcional)</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descrição do procedimento"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { onOpenChange(false); form.reset() }}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

interface DeactivateDialogProps {
  procedure: Procedure | null
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicId: string
}

function DeactivateDialog({ procedure, open, onOpenChange, clinicId }: DeactivateDialogProps) {
  const deactivate = useDeactivateProcedure(clinicId)

  function handleConfirm() {
    if (!procedure) return
    deactivate.mutate(procedure.id, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover procedimento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover <strong>{procedure?.name}</strong>?
            O procedimento será desativado e não aparecerá mais na lista.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deactivate.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deactivate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ServicesTab() {
  const clinicId = tokenService.getUser()?.activeClinic?.id ?? ''
  const { data, isLoading } = useProcedures(clinicId, { status: 'active', limit: 100 })

  const [formOpen, setFormOpen] = useState(false)
  const [editingProcedure, setEditingProcedure] = useState<Procedure | undefined>(undefined)
  const [deactivatingProcedure, setDeactivatingProcedure] = useState<Procedure | null>(null)

  const procedures = data?.data ?? []

  function openCreate() {
    setEditingProcedure(undefined)
    setFormOpen(true)
  }

  function openEdit(p: Procedure) {
    setEditingProcedure(p)
    setFormOpen(true)
  }

  if (isLoading) {
    return <SettingsLoading message="Carregando procedimentos..." />
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-semibold text-foreground">
              Serviços e Procedimentos
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo procedimento
          </Button>
        </div>

        {procedures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
            <Briefcase className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhum procedimento cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre o primeiro serviço ou procedimento da clínica.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar procedimento
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {procedures.map((procedure) => (
              <div
                key={procedure.id}
                className="bg-white rounded-xl border border-border p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate">{procedure.name}</span>
                    {procedure.category && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {procedure.category}
                      </Badge>
                    )}
                  </div>
                  {procedure.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {procedure.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {procedure.defaultDuration} min
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(procedure)}
                    aria-label="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeactivatingProcedure(procedure)}
                    aria-label="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ProcedureFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        procedure={editingProcedure}
        clinicId={clinicId}
      />

      <DeactivateDialog
        procedure={deactivatingProcedure}
        open={!!deactivatingProcedure}
        onOpenChange={(v) => { if (!v) setDeactivatingProcedure(null) }}
        clinicId={clinicId}
      />
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCarolDraftConfig, useSaveCarolConfig } from '../../api/carol.api'

const schema = z.object({
  restrictSensitiveTopics: z.boolean(),
  confirmBeforeScheduling: z.boolean(),
  allowCancellation: z.boolean(),
  allowRescheduling: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const BEHAVIOR_OPTIONS: {
  field: keyof FormValues
  label: string
  description: string
}[] = [
  {
    field: 'restrictSensitiveTopics',
    label: 'Restringir tópicos sensíveis',
    description: 'Carol evita responder perguntas fora do escopo médico/clínico',
  },
  {
    field: 'confirmBeforeScheduling',
    label: 'Confirmar antes de agendar',
    description: 'Carol solicita confirmação do paciente antes de finalizar o agendamento',
  },
  {
    field: 'allowCancellation',
    label: 'Permitir cancelamento',
    description: 'Pacientes podem cancelar consultas diretamente pelo chat',
  },
  {
    field: 'allowRescheduling',
    label: 'Permitir reagendamento',
    description: 'Pacientes podem reagendar consultas diretamente pelo chat',
  },
]

interface BehaviorSubtabProps {
  onSaved: () => void
}

export function BehaviorSubtab({ onSaved }: BehaviorSubtabProps) {
  const { data: draftConfig } = useCarolDraftConfig()
  const { mutate: saveConfig, isPending: isSaving } = useSaveCarolConfig()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      restrictSensitiveTopics: true,
      confirmBeforeScheduling: true,
      allowCancellation: true,
      allowRescheduling: true,
    },
  })

  useEffect(() => {
    if (draftConfig) {
      form.reset({
        restrictSensitiveTopics: draftConfig.restrictSensitiveTopics ?? true,
        confirmBeforeScheduling: draftConfig.schedulingRules?.confirmBeforeScheduling ?? true,
        allowCancellation: draftConfig.schedulingRules?.allowCancellation ?? true,
        allowRescheduling: draftConfig.schedulingRules?.allowRescheduling ?? true,
      })
    }
  }, [draftConfig, form])

  function onSubmit(values: FormValues) {
    saveConfig(
      {
        name: draftConfig?.name ?? 'Carol',
        selectedTraits: draftConfig?.selectedTraits ?? [],
        voiceTone: draftConfig?.voiceTone ?? 'empathetic',
        greeting: draftConfig?.greeting ?? '',
        restrictSensitiveTopics: values.restrictSensitiveTopics,
        schedulingRules: {
          confirmBeforeScheduling: values.confirmBeforeScheduling,
          allowCancellation: values.allowCancellation,
          allowRescheduling: values.allowRescheduling,
          postSchedulingMessage: draftConfig?.schedulingRules?.postSchedulingMessage ?? '',
        },
      },
      { onSuccess: () => onSaved() },
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
      <Card>
        <CardHeader>
          <CardTitle>Comportamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {BEHAVIOR_OPTIONS.map(({ field, label, description }) => (
            <Controller
              key={field}
              control={form.control}
              name={field}
              render={({ field: f }) => (
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={field}
                    checked={f.value}
                    onCheckedChange={f.onChange}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor={field} className="font-medium cursor-pointer">
                      {label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              )}
            />
          ))}
        </CardContent>
      </Card>

      <div>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Rascunho
        </Button>
      </div>
    </form>
  )
}

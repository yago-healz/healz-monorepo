import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { PERSONALITY_TRAITS } from '@/types/onboarding'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCarolDraftConfig, useSaveCarolConfig } from '../api/carol.api'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  selectedTraits: z.array(z.string()),
  voiceTone: z.enum(['formal', 'informal', 'empathetic']),
  greeting: z.string().max(1000),
  restrictSensitiveTopics: z.boolean(),
  schedulingRules: z.object({
    confirmBeforeScheduling: z.boolean(),
    allowCancellation: z.boolean(),
    allowRescheduling: z.boolean(),
    postSchedulingMessage: z.string().max(500),
  }),
})

type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  name: 'Carol',
  selectedTraits: ['welcoming', 'empathetic'],
  voiceTone: 'empathetic',
  greeting: '',
  restrictSensitiveTopics: true,
  schedulingRules: {
    confirmBeforeScheduling: true,
    allowCancellation: true,
    allowRescheduling: true,
    postSchedulingMessage: '',
  },
}

interface CarolSettingsFormProps {
  onSaved: () => void
}

export function CarolSettingsForm({ onSaved }: CarolSettingsFormProps) {
  const { data: draftConfig } = useCarolDraftConfig()
  const { mutate: saveConfig, isPending: isSaving } = useSaveCarolConfig()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (draftConfig) {
      form.reset({
        name: draftConfig.name,
        selectedTraits: draftConfig.selectedTraits,
        voiceTone: draftConfig.voiceTone,
        greeting: draftConfig.greeting,
        restrictSensitiveTopics: draftConfig.restrictSensitiveTopics,
        schedulingRules: {
          confirmBeforeScheduling: draftConfig.schedulingRules?.confirmBeforeScheduling ?? true,
          allowCancellation: draftConfig.schedulingRules?.allowCancellation ?? true,
          allowRescheduling: draftConfig.schedulingRules?.allowRescheduling ?? true,
          postSchedulingMessage: draftConfig.schedulingRules?.postSchedulingMessage ?? '',
        },
      })
    }
  }, [draftConfig, form])

  function onSubmit(values: FormValues) {
    saveConfig(values, { onSuccess: () => onSaved() })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
      {/* Identidade */}
      <Card>
        <CardHeader>
          <CardTitle>Identidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tom de voz</Label>
            <Controller
              control={form.control}
              name="voiceTone"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="empathetic" id="tone-empathetic" />
                    <Label htmlFor="tone-empathetic" className="font-normal">Empático</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="formal" id="tone-formal" />
                    <Label htmlFor="tone-formal" className="font-normal">Formal</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="informal" id="tone-informal" />
                    <Label htmlFor="tone-informal" className="font-normal">Informal</Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Personalidade</Label>
            <Controller
              control={form.control}
              name="selectedTraits"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {PERSONALITY_TRAITS.map((trait) => {
                    const checked = field.value.includes(trait.id)
                    return (
                      <button
                        key={trait.id}
                        type="button"
                        onClick={() => {
                          field.onChange(
                            checked
                              ? field.value.filter((t) => t !== trait.id)
                              : [...field.value, trait.id]
                          )
                        }}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          checked
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border hover:border-primary'
                        }`}
                      >
                        {trait.label}
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Saudação */}
      <Card>
        <CardHeader>
          <CardTitle>Saudação Inicial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="greeting">Mensagem de saudação</Label>
            <Textarea
              id="greeting"
              rows={4}
              placeholder="Olá! Sou a Carol, assistente da clínica. Como posso te ajudar?"
              {...form.register('greeting')}
            />
            {form.formState.errors.greeting && (
              <p className="text-sm text-destructive">{form.formState.errors.greeting.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Regras */}
      <Card>
        <CardHeader>
          <CardTitle>Regras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            control={form.control}
            name="restrictSensitiveTopics"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="restrictSensitiveTopics"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="restrictSensitiveTopics" className="font-normal">
                  Restringir tópicos sensíveis
                </Label>
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="schedulingRules.confirmBeforeScheduling"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="confirmBeforeScheduling"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="confirmBeforeScheduling" className="font-normal">
                  Confirmar antes de agendar
                </Label>
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="schedulingRules.allowCancellation"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allowCancellation"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="allowCancellation" className="font-normal">
                  Permitir cancelamento
                </Label>
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="schedulingRules.allowRescheduling"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allowRescheduling"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="allowRescheduling" className="font-normal">
                  Permitir reagendamento
                </Label>
              </div>
            )}
          />

          <div className="space-y-2">
            <Label htmlFor="postSchedulingMessage">Mensagem pós-agendamento</Label>
            <Input
              id="postSchedulingMessage"
              placeholder="Seu agendamento foi confirmado! Em caso de dúvidas, entre em contato."
              {...form.register('schedulingRules.postSchedulingMessage')}
            />
          </div>
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

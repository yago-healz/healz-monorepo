import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useCarolDraftConfig, useSaveCarolConfig } from '../../api/carol.api'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  selectedTraits: z.array(z.string()),
  voiceTone: z.enum(['formal', 'informal', 'empathetic']),
  greeting: z.string().max(1000),
  postSchedulingMessage: z.string().max(500),
})

type FormValues = z.infer<typeof schema>

interface IdentitySubtabProps {
  onSaved: () => void
}

export function IdentitySubtab({ onSaved }: IdentitySubtabProps) {
  const { data: draftConfig } = useCarolDraftConfig()
  const { mutate: saveConfig, isPending: isSaving } = useSaveCarolConfig()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: 'Carol',
      selectedTraits: ['welcoming', 'empathetic'],
      voiceTone: 'empathetic',
      greeting: '',
      postSchedulingMessage: '',
    },
  })

  useEffect(() => {
    if (draftConfig) {
      form.reset({
        name: draftConfig.name,
        selectedTraits: draftConfig.selectedTraits,
        voiceTone: draftConfig.voiceTone,
        greeting: draftConfig.greeting,
        postSchedulingMessage: draftConfig.schedulingRules?.postSchedulingMessage ?? '',
      })
    }
  }, [draftConfig, form])

  function onSubmit(values: FormValues) {
    saveConfig(
      {
        name: values.name,
        selectedTraits: values.selectedTraits,
        voiceTone: values.voiceTone,
        greeting: values.greeting,
        restrictSensitiveTopics: draftConfig?.restrictSensitiveTopics ?? true,
        schedulingRules: {
          confirmBeforeScheduling: draftConfig?.schedulingRules?.confirmBeforeScheduling ?? true,
          allowCancellation: draftConfig?.schedulingRules?.allowCancellation ?? true,
          allowRescheduling: draftConfig?.schedulingRules?.allowRescheduling ?? true,
          postSchedulingMessage: values.postSchedulingMessage,
        },
      },
      { onSuccess: () => onSaved() },
    )
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

      {/* Mensagem pós-agendamento */}
      <Card>
        <CardHeader>
          <CardTitle>Mensagem Pós-Agendamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="postSchedulingMessage">Mensagem enviada após confirmação do agendamento</Label>
            <Input
              id="postSchedulingMessage"
              placeholder="Seu agendamento foi confirmado! Em caso de dúvidas, entre em contato."
              {...form.register('postSchedulingMessage')}
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

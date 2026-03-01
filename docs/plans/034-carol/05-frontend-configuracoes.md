# Fase 05 — Frontend: Página de Configurações Carol

## Objetivo

Criar a página dedicada de configurações da Carol com todos os campos do MVP, badge de status, e botão de publicação.

## Pré-requisitos

- Fase 02 concluída (endpoints de config + versões funcionando)
- Fase 04 concluída (rota `/clinic/carol/settings` existe)

## Pode ser feita em paralelo com

- Fase 06 (Frontend Playground)

---

## Arquivos

### Criar
- `apps/web/src/features/carol/components/carol-settings-page.tsx`
- `apps/web/src/features/carol/api/carol.api.ts`
- `apps/web/src/features/carol/types.ts`

### Modificar
- `apps/web/src/routes/_authenticated/clinic/carol/settings.tsx` — trocar placeholder pelo componente real

---

## Types

```typescript
// features/carol/types.ts

export interface CarolConfig {
  id: string
  clinicId: string
  name: string
  selectedTraits: string[]
  voiceTone: 'formal' | 'informal' | 'empathetic'
  greeting: string
  restrictSensitiveTopics: boolean
  schedulingRules: SchedulingRules
  status: 'draft' | 'published'
  publishedAt: string | null
  createdAt: string
  updatedAt: string | null
}

export interface SchedulingRules {
  confirmBeforeScheduling: boolean
  allowCancellation: boolean
  allowRescheduling: boolean
  postSchedulingMessage: string
}

export interface SaveCarolConfigRequest {
  name?: string
  selectedTraits?: string[]
  voiceTone?: string
  greeting?: string
  restrictSensitiveTopics?: boolean
  schedulingRules?: Partial<SchedulingRules>
}

export interface ChatRequest {
  message: string
  version: 'draft' | 'published'
  sessionId?: string
}

export interface ChatResponse {
  reply: string
  sessionId: string
  toolsUsed?: string[]
}
```

---

## API Hooks

```typescript
// features/carol/api/carol.api.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { tokenService } from '@/services/token.service'
import { toast } from 'sonner'
import type { CarolConfig, SaveCarolConfigRequest } from '../types'

const getClinicId = () => tokenService.getActiveClinicId() ?? ''

// ─── Config Queries ───

export const useCarolDraftConfig = () => {
  const clinicId = getClinicId()
  return useQuery<CarolConfig | null>({
    queryKey: ['carol', clinicId, 'config', 'draft'],
    queryFn: async () => {
      const { data } = await api.get(ENDPOINTS.CAROL.CONFIG(clinicId))
      return data
    },
    enabled: !!clinicId,
  })
}

export const useCarolPublishedConfig = () => {
  const clinicId = getClinicId()
  return useQuery<CarolConfig | null>({
    queryKey: ['carol', clinicId, 'config', 'published'],
    queryFn: async () => {
      const { data } = await api.get(ENDPOINTS.CAROL.CONFIG_PUBLISHED(clinicId))
      return data
    },
    enabled: !!clinicId,
  })
}

// ─── Config Mutations ───

export const useSaveCarolConfig = () => {
  const clinicId = getClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SaveCarolConfigRequest) => {
      const { data: result } = await api.put(ENDPOINTS.CAROL.CONFIG(clinicId), data)
      return result as CarolConfig
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carol', clinicId, 'config', 'draft'] })
      toast.success('Configurações salvas como rascunho')
    },
    onError: () => {
      toast.error('Erro ao salvar configurações')
    },
  })
}

export const usePublishCarolConfig = () => {
  const clinicId = getClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(ENDPOINTS.CAROL.PUBLISH(clinicId))
      return data as CarolConfig
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carol', clinicId] })
      toast.success('Carol publicada com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao publicar Carol')
    },
  })
}

// ─── Chat (usado na Fase 06) ───

export const useSendMessage = () => {
  const clinicId = getClinicId()

  return useMutation({
    mutationFn: async (data: { message: string; version: 'draft' | 'published'; sessionId?: string }) => {
      const { data: result } = await api.post(ENDPOINTS.CAROL.CHAT(clinicId), data)
      return result as { reply: string; sessionId: string; toolsUsed?: string[] }
    },
  })
}
```

---

## Página de Configurações

Layout com 4 seções em cards:

```
┌─────────────────────────────────────────────────────────┐
│  Configurações da Carol                                 │
│  Configure como Carol interage com seus pacientes       │
│                                                         │
│  ┌── Status ──────────────────────────────────────────┐ │
│  │ Rascunho [Badge]    Última publicação: dd/mm/yyyy  │ │
│  │                                    [Publicar]      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌── Identidade ──────────────────────────────────────┐ │
│  │ Nome: [____________]                               │ │
│  │ Tom de voz: (●) Empático (○) Formal (○) Informal   │ │
│  │ Personalidade: [welcoming] [empathetic] [...]      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌── Saudação Inicial ────────────────────────────────┐ │
│  │ [Textarea com a mensagem de saudação]              │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌── Regras ──────────────────────────────────────────┐ │
│  │ ☑ Restringir tópicos sensíveis                     │ │
│  │ ☑ Confirmar antes de agendar                       │ │
│  │ ☑ Permitir cancelamento                            │ │
│  │ ☑ Permitir reagendamento                           │ │
│  │ Mensagem pós-agendamento: [________________]       │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  [Salvar Rascunho]                                      │
└─────────────────────────────────────────────────────────┘
```

### Componente

```typescript
// features/carol/components/carol-settings-page.tsx

export function CarolSettingsPage() {
  const { data: draftConfig, isLoading } = useCarolDraftConfig()
  const { data: publishedConfig } = useCarolPublishedConfig()
  const { mutate: saveConfig, isPending: isSaving } = useSaveCarolConfig()
  const { mutate: publishConfig, isPending: isPublishing } = usePublishCarolConfig()

  // React Hook Form com Zod validation
  const form = useForm<FormValues>({
    resolver: zodResolver(carolConfigSchema),
    defaultValues: {
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
    },
  })

  // Carregar dados do draft quando disponível
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
    saveConfig(values)
  }

  if (isLoading) return <SettingsLoading />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações da Carol</h1>
        <p className="text-muted-foreground">Configure como Carol interage com seus pacientes</p>
      </div>

      {/* Status Card */}
      {/* Badge "Rascunho" ou "Publicada", data da última publicação, botão Publicar */}

      {/* Form Cards (Identidade, Saudação, Regras) */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Card: Identidade */}
        {/* Card: Saudação */}
        {/* Card: Regras */}

        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
        </Button>
      </form>
    </div>
  )
}
```

---

## Validação (Zod Schema)

```typescript
const carolConfigSchema = z.object({
  name: z.string().min(1).max(100),
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
```

---

## Personality Traits

Reutilizar `PERSONALITY_TRAITS` de `@/types/onboarding` (já existe no projeto).

---

## Checklist

- [ ] Criar `features/carol/types.ts`
- [ ] Criar `features/carol/api/carol.api.ts` com queries e mutations
- [ ] Implementar `CarolSettingsPage` com 4 seções (Status, Identidade, Saudação, Regras)
- [ ] Integrar React Hook Form + Zod validation
- [ ] Carregar dados do draft e popular formulário
- [ ] Botão "Salvar Rascunho" funcional
- [ ] Botão "Publicar" com confirmação e feedback
- [ ] Badge de status (Rascunho/Publicada)
- [ ] Trocar placeholder na rota pelo componente real

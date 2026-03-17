# Tarefa 03 — Criar CarolTab com sub-abas

**Objetivo:** Criar o container da aba Carol com header (status + Publicar + toggle Playground), sub-navegação vertical (Identidade | Comportamento | Contexto da Clínica) e painel Playground à direita.

---

## Arquivos a criar

```
apps/web/src/features/carol/components/carol-tab.tsx
apps/web/src/features/carol/components/subtabs/identity-subtab.tsx
apps/web/src/features/carol/components/subtabs/behavior-subtab.tsx
apps/web/src/features/carol/components/subtabs/clinic-context-subtab.tsx
```

---

## 1. `carol-tab.tsx`

Responsável por: header com status/publicar/playground toggle, sub-nav, split layout.

```tsx
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCarolDraftConfig, useCarolPublishedConfig, usePublishCarolConfig } from '../api/carol.api'
import { CarolChatPanel } from './carol-chat-panel'
import { IdentitySubtab } from './subtabs/identity-subtab'
import { BehaviorSubtab } from './subtabs/behavior-subtab'
import { ClinicContextSubtab } from './subtabs/clinic-context-subtab'
import { Route } from '@/routes/_authenticated/clinic/settings'
import type { CarolSubTab } from '@/routes/_authenticated/clinic/settings'

const SUB_TABS: { id: CarolSubTab; label: string }[] = [
  { id: 'identidade', label: 'Identidade' },
  { id: 'comportamento', label: 'Comportamento' },
  { id: 'contexto', label: 'Contexto da Clínica' },
]

export function CarolTab() {
  const { subTab } = Route.useSearch()
  const activeSubTab: CarolSubTab = (subTab as CarolSubTab) ?? 'identidade'
  const navigate = useNavigate({ from: Route.fullPath })

  const { data: draftConfig } = useCarolDraftConfig()
  const { data: publishedConfig } = useCarolPublishedConfig()
  const { mutate: publishConfig, isPending: isPublishing } = usePublishCarolConfig()

  const [chatOpen, setChatOpen] = useState<boolean>(
    () => localStorage.getItem('carol_chat_panel_open') !== 'false'
  )
  const [chatResetKey, setChatResetKey] = useState(0)

  function toggleChat() {
    setChatOpen((prev) => {
      const next = !prev
      localStorage.setItem('carol_chat_panel_open', String(next))
      return next
    })
  }

  function handleSubTabChange(tab: CarolSubTab) {
    navigate({ search: (prev) => ({ ...prev, subTab: tab }), replace: true })
  }

  function handleSaved() {
    setChatResetKey((k) => k + 1)
  }

  const isPublished = draftConfig?.status === 'published'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b flex-none">
        <div className="flex items-center gap-2">
          <Badge variant={isPublished ? 'default' : 'secondary'}>
            {isPublished ? 'Publicada' : 'Rascunho'}
          </Badge>
          {publishedConfig?.publishedAt && (
            <span className="text-sm text-muted-foreground">
              Última publicação:{' '}
              {format(new Date(publishedConfig.publishedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleChat}>
            {chatOpen
              ? <PanelRightClose className="w-4 h-4 mr-2" />
              : <PanelRightOpen className="w-4 h-4 mr-2" />
            }
            Playground
          </Button>
          <Button disabled={isPublishing} onClick={() => publishConfig()}>
            {isPublishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Publicar
          </Button>
        </div>
      </div>

      {/* Split: sub-nav + content | playground */}
      <div className="flex flex-1 overflow-hidden gap-6 pt-4">
        {/* Esquerda: sub-nav vertical + conteúdo */}
        <div className={cn('flex gap-8 overflow-y-auto', chatOpen ? 'flex-[3]' : 'flex-1')}>
          <nav className="w-44 shrink-0 flex flex-col gap-1">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleSubTabChange(tab.id)}
                className={cn(
                  'w-full text-left rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  activeSubTab === tab.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-w-0 pb-6">
            {activeSubTab === 'identidade' && <IdentitySubtab onSaved={handleSaved} />}
            {activeSubTab === 'comportamento' && <BehaviorSubtab onSaved={handleSaved} />}
            {activeSubTab === 'contexto' && <ClinicContextSubtab />}
          </div>
        </div>

        {/* Direita: playground */}
        {chatOpen && (
          <div className="flex-[2] border rounded-lg overflow-hidden flex flex-col">
            <CarolChatPanel resetKey={chatResetKey} />
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 2. `identity-subtab.tsx`

Campos: `name`, `voiceTone`, `selectedTraits`, `greeting`, `schedulingRules.postSchedulingMessage`.

Extrair esses campos do `CarolSettingsForm` atual (que continha tudo junto). Manter o mesmo schema Zod, mas apenas com esses 5 campos. Ao salvar, faz merge com os campos de comportamento: busca o `draftConfig` e envia o objeto completo com os campos de comportamento inalterados.

```tsx
// Padrão: igual ao CarolSettingsForm mas com subset dos campos
// Schema parcial:
const schema = z.object({
  name: z.string().min(1).max(100),
  selectedTraits: z.array(z.string()),
  voiceTone: z.enum(['formal', 'informal', 'empathetic']),
  greeting: z.string().max(1000),
  postSchedulingMessage: z.string().max(500),
})

// onSubmit: merge com draftConfig antes de salvar
function onSubmit(values: FormValues) {
  saveConfig({
    ...values,
    postSchedulingMessage: undefined, // movido para schedulingRules
    schedulingRules: {
      confirmBeforeScheduling: draftConfig?.schedulingRules?.confirmBeforeScheduling ?? true,
      allowCancellation: draftConfig?.schedulingRules?.allowCancellation ?? true,
      allowRescheduling: draftConfig?.schedulingRules?.allowRescheduling ?? true,
      postSchedulingMessage: values.postSchedulingMessage,
    },
    restrictSensitiveTopics: draftConfig?.restrictSensitiveTopics ?? true,
  })
}
```

Renderiza os mesmos cards de identidade + saudação + mensagem pós-agendamento.
Botão "Salvar Rascunho" ao final.

---

## 3. `behavior-subtab.tsx`

Campos: `restrictSensitiveTopics`, `confirmBeforeScheduling`, `allowCancellation`, `allowRescheduling`.

```tsx
const schema = z.object({
  restrictSensitiveTopics: z.boolean(),
  confirmBeforeScheduling: z.boolean(),
  allowCancellation: z.boolean(),
  allowRescheduling: z.boolean(),
})

// onSubmit: merge com draftConfig para não perder campos de identidade
function onSubmit(values: FormValues) {
  saveConfig({
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
  })
}
```

Renderiza como lista de checkboxes com descrição por item (não apenas label). Botão "Salvar Rascunho" ao final.

---

## 4. `clinic-context-subtab.tsx`

Reutiliza diretamente o conteúdo do `ObjectivesTab` existente.

```tsx
// Copiar/mover o conteúdo de objectives-tab.tsx para cá.
// O componente ObjectivesTab continua existindo pois é importado pelo ClinicaTab também?
// Não — Objetivos sai da aba Clínica. Então ObjectivesTab pode ser renomeado/movido
// para clinic-context-subtab.tsx, ou simplesmente re-exportado.
//
// Solução mais simples: clinic-context-subtab.tsx importa e re-renderiza ObjectivesTab.
import { ObjectivesTab } from '@/features/clinic/components/settings/tabs/objectives-tab'

export function ClinicContextSubtab() {
  return <ObjectivesTab />
}
```

---

## Critério de conclusão

- Todas as 3 sub-abas renderizam sem erro
- Salvar em IdentitySubtab não zera os campos de BehaviorSubtab e vice-versa (merge correto)
- ClinicContextSubtab salva via `useSaveClinicObjectives` (sem mudança de endpoint)
- Playground togla corretamente e persiste no localStorage

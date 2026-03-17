import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Route } from '@/routes/_authenticated/clinic/settings'
import type { CarolSubTab } from '@/routes/_authenticated/clinic/settings'
import { useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useState } from 'react'
import { useCarolDraftConfig, useCarolPublishedConfig, usePublishCarolConfig } from '../api/carol.api'
import { CarolChatPanel } from './carol-chat-panel'
import { BehaviorSubtab } from './subtabs/behavior-subtab'
import { ClinicContextSubtab } from './subtabs/clinic-context-subtab'
import { IdentitySubtab } from './subtabs/identity-subtab'

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

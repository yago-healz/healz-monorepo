import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Route } from '@/routes/_authenticated/clinic/carol/settings'
import type { CarolSubTab } from '@/routes/_authenticated/clinic/carol/settings'
import { useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import { useCarolDraftConfig, useCarolPublishedConfig, usePublishCarolConfig } from '../api/carol.api'
import { BehaviorSubtab } from './subtabs/behavior-subtab'
import { ClinicContextSubtab } from './subtabs/clinic-context-subtab'
import { EscalationTriggersSubtab } from './subtabs/escalation-triggers-subtab'
import { IdentitySubtab } from './subtabs/identity-subtab'

const SUB_TABS: { id: CarolSubTab; label: string }[] = [
  { id: 'identidade', label: 'Identidade' },
  { id: 'comportamento', label: 'Comportamento' },
  { id: 'contexto', label: 'Contexto da Clínica' },
  { id: 'encaminhamento', label: 'Regras de Encaminhamento' },
]

interface CarolTabProps {
  onSaved: () => void
}

export function CarolTab({ onSaved }: CarolTabProps) {
  const { subTab } = Route.useSearch()
  const activeSubTab: CarolSubTab = (subTab as CarolSubTab) ?? 'identidade'
  const navigate = useNavigate({ from: Route.fullPath })

  const { data: draftConfig } = useCarolDraftConfig()
  const { data: publishedConfig } = useCarolPublishedConfig()
  const { mutate: publishConfig, isPending: isPublishing } = usePublishCarolConfig()

  function handleSubTabChange(tab: CarolSubTab) {
    navigate({ search: (prev) => ({ ...prev, subTab: tab }), replace: true })
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
        <Button disabled={isPublishing} onClick={() => publishConfig()}>
          {isPublishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Publicar
        </Button>
      </div>

      {/* Sub-nav vertical + conteúdo */}
      <div className="flex gap-8 overflow-y-auto flex-1 pt-4">
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
          {activeSubTab === 'identidade' && <IdentitySubtab onSaved={onSaved} />}
          {activeSubTab === 'comportamento' && <BehaviorSubtab onSaved={onSaved} />}
          {activeSubTab === 'contexto' && <ClinicContextSubtab />}
          {activeSubTab === 'encaminhamento' && <EscalationTriggersSubtab />}
        </div>
      </div>
    </div>
  )
}

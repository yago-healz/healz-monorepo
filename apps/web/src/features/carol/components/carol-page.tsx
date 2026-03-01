import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SettingsLoading } from '@/features/clinic/components/settings/tabs/settings-loading'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useState } from 'react'
import { useCarolDraftConfig, useCarolPublishedConfig, usePublishCarolConfig } from '../api/carol.api'
import { CarolChatPanel } from './carol-chat-panel'
import { CarolSettingsForm } from './carol-settings-form'

export function CarolPage() {
  const { data: draftConfig, isLoading } = useCarolDraftConfig()
  const { data: publishedConfig } = useCarolPublishedConfig()
  const { mutate: publishConfig, isPending: isPublishing } = usePublishCarolConfig()

  const [chatOpen, setChatOpen] = useState<boolean>(() => {
    return localStorage.getItem('carol_chat_panel_open') !== 'false'
  })
  const [chatResetKey, setChatResetKey] = useState(0)

  function toggleChat() {
    setChatOpen((prev) => {
      const next = !prev
      localStorage.setItem('carol_chat_panel_open', String(next))
      return next
    })
  }

  function handleSaved() {
    setChatResetKey((k) => k + 1)
  }

  if (isLoading) return <SettingsLoading />

  const isPublished = draftConfig?.status === 'published'

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b flex-none">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carol</h1>
          <div className="flex items-center gap-2 mt-1">
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

      {/* Split content */}
      <div className="flex flex-1 overflow-hidden gap-6 pt-4">
        {/* Left column — settings */}
        <div className={cn('overflow-y-auto', chatOpen ? 'flex-[3]' : 'flex-1')}>
          <CarolSettingsForm onSaved={handleSaved} />
        </div>

        {/* Right column — chat */}
        {chatOpen && (
          <div className="flex-[2] border rounded-lg overflow-hidden flex flex-col">
            <CarolChatPanel resetKey={chatResetKey} />
          </div>
        )}
      </div>
    </div>
  )
}

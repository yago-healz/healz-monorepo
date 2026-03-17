import { Button } from '@/components/ui/button'
import { CarolChatPanel } from '@/features/carol/components/carol-chat-panel'
import { CarolTab } from '@/features/carol/components/carol-tab'
import { cn } from '@/lib/utils'
import { Route } from '@/routes/_authenticated/clinic/carol/settings'
import { useNavigate } from '@tanstack/react-router'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useState } from 'react'
import { ClinicaTab } from './clinica-tab'

const MAIN_TABS = [
  { id: 'carol', label: 'Carol' },
  { id: 'clinica', label: 'Clínica' },
] as const

export function UnifiedSettingsPage() {
  const { mainTab = 'carol' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

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

  function handleSaved() {
    setChatResetKey((k) => k + 1)
  }

  function handleMainTabChange(tab: 'carol' | 'clinica') {
    navigate({
      search: (prev) => ({ ...prev, mainTab: tab, subTab: undefined }),
      replace: true,
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Abas horizontais principais + botão Playground */}
      <div className="border-b flex-none flex items-center justify-between px-1">
        <nav className="flex gap-1">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleMainTabChange(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                mainTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <Button variant="outline" size="sm" onClick={toggleChat} className="mr-1">
          {chatOpen
            ? <PanelRightClose className="w-4 h-4 mr-2" />
            : <PanelRightOpen className="w-4 h-4 mr-2" />
          }
          Playground
        </Button>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden gap-6 pt-4">
        <div className={cn('overflow-y-auto', chatOpen ? 'flex-[3]' : 'flex-1')}>
          {mainTab === 'carol' && <CarolTab onSaved={handleSaved} />}
          {mainTab === 'clinica' && <ClinicaTab />}
        </div>
        {chatOpen && (
          <div className="flex-[2] border rounded-lg overflow-hidden flex flex-col">
            <CarolChatPanel resetKey={chatResetKey} />
          </div>
        )}
      </div>
    </div>
  )
}

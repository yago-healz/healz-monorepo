import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import { GeneralTab } from './tabs/general-tab'
import { ObjectivesTab } from './tabs/objectives-tab'
import { ServicesTab } from './tabs/services-tab'
import { SchedulingTab } from './tabs/scheduling-tab'
import { NotificationsTab } from './tabs/notifications-tab'
import { ConnectorsTab } from './tabs/connectors-tab'
import { Route } from '@/routes/_authenticated/clinic/settings'

const tabs = [
  { id: 'geral', label: 'Geral' },
  { id: 'objetivos', label: 'Objetivos' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'agendamentos', label: 'Agendamentos' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'conectores', label: 'Conectores' },
] as const

type TabId = typeof tabs[number]['id']

export function ClinicSettingsPage() {
  const { tab: activeTab = 'geral' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  function handleTabChange(tabId: TabId) {
    navigate({ search: (prev) => ({ ...prev, tab: tabId }), replace: true })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações da clínica</p>
      </div>

      <Separator />

      <div className="flex gap-8">
        <nav className="w-48 shrink-0 flex flex-col gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'w-full text-left rounded-md px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === 'geral' && <GeneralTab />}
          {activeTab === 'objetivos' && <ObjectivesTab />}
          {activeTab === 'servicos' && <ServicesTab />}
          {activeTab === 'agendamentos' && <SchedulingTab />}
          {activeTab === 'notificacoes' && <NotificationsTab />}
          {activeTab === 'conectores' && <ConnectorsTab />}
        </div>
      </div>
    </div>
  )
}

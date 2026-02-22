import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { GeneralTab } from './tabs/general-tab'
import { ObjectivesTab } from './tabs/objectives-tab'
import { ServicesTab } from './tabs/services-tab'
import { SchedulingTab } from './tabs/scheduling-tab'
import { CarolTab } from './tabs/carol-tab'
import { NotificationsTab } from './tabs/notifications-tab'
import { ConnectorsTab } from './tabs/connectors-tab'

const tabs = [
  { id: 'geral', label: 'Geral' },
  { id: 'objetivos', label: 'Objetivos' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'agendamentos', label: 'Agendamentos' },
  { id: 'carol', label: 'Carol' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'conectores', label: 'Conectores' },
]

export function ClinicSettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('geral')

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
              onClick={() => setActiveTab(tab.id)}
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
          {activeTab === 'carol' && <CarolTab />}
          {activeTab === 'notificacoes' && <NotificationsTab />}
          {activeTab === 'conectores' && <ConnectorsTab />}
        </div>
      </div>
    </div>
  )
}

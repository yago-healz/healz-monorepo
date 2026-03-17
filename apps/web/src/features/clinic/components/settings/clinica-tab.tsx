import { cn } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import { GeneralTab } from './tabs/general-tab'
import { ServicesTab } from './tabs/services-tab'
import { SchedulingTab } from './tabs/scheduling-tab'
import { PaymentMethodsTab } from './tabs/payment-methods-tab'
import { ConnectorsTab } from './tabs/connectors-tab'
import { NotificationsTab } from './tabs/notifications-tab'
import { Route } from '@/routes/_authenticated/clinic/carol/settings'
import type { ClinicaSubTab } from '@/routes/_authenticated/clinic/carol/settings'

const SUB_TABS: { id: ClinicaSubTab; label: string }[] = [
  { id: 'geral', label: 'Geral' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'conectores', label: 'Conectores' },
  { id: 'notificacoes', label: 'Notificações' },
]

export function ClinicaTab() {
  const { subTab } = Route.useSearch()
  const activeSubTab: ClinicaSubTab = (subTab as ClinicaSubTab) ?? 'geral'
  const navigate = useNavigate({ from: Route.fullPath })

  function handleSubTabChange(tab: ClinicaSubTab) {
    navigate({ search: (prev) => ({ ...prev, subTab: tab }), replace: true })
  }

  return (
    <div className="flex gap-8 h-full overflow-hidden">
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

      <div className="flex-1 min-w-0 overflow-y-auto pb-6">
        {activeSubTab === 'geral' && <GeneralTab />}
        {activeSubTab === 'servicos' && <ServicesTab />}
        {activeSubTab === 'agenda' && <SchedulingTab />}
        {activeSubTab === 'pagamento' && <PaymentMethodsTab />}
        {activeSubTab === 'conectores' && <ConnectorsTab />}
        {activeSubTab === 'notificacoes' && <NotificationsTab />}
      </div>
    </div>
  )
}

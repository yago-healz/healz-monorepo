import { cn } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/_authenticated/clinic/settings'
import { CarolTab } from '@/features/carol/components/carol-tab'
import { ClinicaTab } from './clinica-tab'

const MAIN_TABS = [
  { id: 'carol', label: 'Carol' },
  { id: 'clinica', label: 'Clínica' },
] as const

export function UnifiedSettingsPage() {
  const { mainTab = 'carol' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  function handleMainTabChange(tab: 'carol' | 'clinica') {
    navigate({
      search: (prev) => ({ ...prev, mainTab: tab, subTab: undefined }),
      replace: true,
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Abas horizontais principais */}
      <div className="border-b flex-none">
        <nav className="flex gap-1 px-1">
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
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 overflow-hidden pt-4">
        {mainTab === 'carol' && <CarolTab />}
        {mainTab === 'clinica' && <ClinicaTab />}
      </div>
    </div>
  )
}

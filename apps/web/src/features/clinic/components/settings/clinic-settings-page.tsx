import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const tabs = [
  { id: 'geral', label: 'Geral' },
  { id: 'objetivos', label: 'Objetivos' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'agendamentos', label: 'Agendamentos' },
  { id: 'carol', label: 'Carol' },
  { id: 'conectores', label: 'Conectores' },
]

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{name}</h2>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground text-sm">
          Esta seção está em desenvolvimento.
        </p>
      </div>
    </div>
  )
}

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
          <PlaceholderTab name={tabs.find(t => t.id === activeTab)?.label ?? ''} />
        </div>
      </div>
    </div>
  )
}

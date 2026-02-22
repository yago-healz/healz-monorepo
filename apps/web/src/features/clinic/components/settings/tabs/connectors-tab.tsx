import { useState, useEffect } from 'react'
import { CalendarDays, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsLoading } from './settings-loading'
import { useClinicConnectors, useSaveClinicConnectors } from '@/features/clinic/api/clinic-settings.api'
import type { ConnectorStatus } from '@/features/clinic/api/clinic-settings.api'
import { tokenService } from '@/services/token.service'

const connectors: {
  id: keyof ConnectorStatus
  label: string
  description: string
  icon: React.ElementType
}[] = [
  {
    id: 'googleCalendar',
    label: 'Google Calendar',
    description: 'Sincronize agendamentos com o Google Calendar',
    icon: CalendarDays,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Envie mensagens via WhatsApp Business',
    icon: MessageCircle,
  },
]

interface ConnectorRowProps {
  connector: (typeof connectors)[number]
  isConnected: boolean
  isPending: boolean
  onToggle: (key: keyof ConnectorStatus, value: boolean) => void
}

function ConnectorRow({ connector, isConnected, isPending, onToggle }: ConnectorRowProps) {
  const Icon = connector.icon

  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium">{connector.label}</p>
          <p className="text-muted-foreground text-sm">{connector.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isConnected ? (
          <>
            <span className="text-pink-500 text-sm font-medium">Conectado</span>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive text-sm"
              disabled={isPending}
              onClick={() => onToggle(connector.id, false)}
            >
              Desconectar
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onToggle(connector.id, true)}
          >
            Vincular
          </Button>
        )}
      </div>
    </div>
  )
}

export function ConnectorsTab() {
  const clinicId = tokenService.getUser()?.activeClinic?.id ?? ''

  const [connected, setConnected] = useState<ConnectorStatus>({
    googleCalendar: false,
    whatsapp: false,
  })

  const { data, isLoading } = useClinicConnectors(clinicId)
  const { mutate: save, isPending } = useSaveClinicConnectors(clinicId)

  useEffect(() => {
    if (data) setConnected(data)
  }, [data])

  const handleToggle = (key: keyof ConnectorStatus, value: boolean) => {
    const next = { ...connected, [key]: value }
    setConnected(next)
    save(next)
  }

  if (isLoading) return <SettingsLoading />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Conectores</h2>
        <p className="text-muted-foreground text-sm">
          Conecte a clínica a outros aplicativos e serviços.
        </p>
      </div>

      <div className="rounded-lg border border-border shadow-sm divide-y divide-border">
        {connectors.map(connector => (
          <ConnectorRow
            key={connector.id}
            connector={connector}
            isConnected={connected[connector.id]}
            isPending={isPending}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  )
}

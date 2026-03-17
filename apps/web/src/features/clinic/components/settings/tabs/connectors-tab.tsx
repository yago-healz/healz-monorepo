import { Button } from '@/components/ui/button'
import {
  useClinicConnectors,
  useDisconnectGoogleCalendar,
} from '@/features/clinic/api/clinic-settings.api'
import api from '@/lib/api/axios'
import { CLINIC_SETTINGS_ENDPOINTS } from '@/lib/api/clinic-settings-endpoints'
import { Route } from '@/routes/_authenticated/clinic/carol/settings'
import { tokenService } from '@/services/token.service'
import { useNavigate } from '@tanstack/react-router'
import { CalendarDays, Loader2, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CalendarPickerModal } from './calendar-picker-modal'
import { SettingsLoading } from './settings-loading'

export function ConnectorsTab() {
  const clinicId = tokenService.getUser()?.activeClinic?.id ?? ''
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const { data, isLoading } = useClinicConnectors(clinicId)
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectGoogleCalendar(clinicId)

  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  // Handle OAuth callback params
  useEffect(() => {
    if (search.gcal === 'pending-calendar-selection') {
      setCalendarPickerOpen(true)
      navigate({ search: (prev) => ({ mainTab: prev.mainTab, subTab: prev.subTab }), replace: true })
    } else if (search.gcal === 'error') {
      toast.error(search.reason ?? 'Erro ao conectar Google Calendar.')
      navigate({ search: (prev) => ({ mainTab: prev.mainTab, subTab: prev.subTab }), replace: true })
    }
  }, [search.gcal, search.reason, navigate])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const { data: result } = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.GOOGLE_CALENDAR_AUTH_URL(clinicId),
      )
      window.location.href = result.authUrl
    } catch {
      toast.error('Erro ao iniciar conexão com Google Calendar.')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  if (isLoading) return <SettingsLoading />

  const isGoogleConnected = data?.googleCalendar ?? false

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Conectores</h2>
          <p className="text-muted-foreground text-sm">
            Conecte a clínica a outros aplicativos e serviços.
          </p>
        </div>

        <div className="rounded-lg border border-border shadow-sm divide-y divide-border">
          {/* Google Calendar */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Google Calendar</p>
                <p className="text-muted-foreground text-sm">
                  Sincronize agendamentos com o Google Calendar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isGoogleConnected ? (
                <>
                  <span className="text-pink-500 text-sm font-medium">Conectado</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive text-sm"
                    disabled={isDisconnecting}
                    onClick={handleDisconnect}
                  >
                    {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Desconectar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isConnecting}
                  onClick={handleConnect}
                >
                  {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Vincular
                </Button>
              )}
            </div>
          </div>

          {/* WhatsApp */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">WhatsApp</p>
                <p className="text-muted-foreground text-sm">
                  Envie mensagens via WhatsApp Business
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {data?.whatsapp ? (
                <>
                  <span className="text-pink-500 text-sm font-medium">Conectado</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive text-sm"
                    disabled
                  >
                    Desconectar
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Vincular
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <CalendarPickerModal
        clinicId={clinicId}
        open={calendarPickerOpen}
        onClose={() => setCalendarPickerOpen(false)}
      />
    </>
  )
}

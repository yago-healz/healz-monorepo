import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useDoctorConnectors,
  useDoctorGoogleCalendarCalendars,
  useSelectDoctorGoogleCalendar,
  useDisconnectDoctorGoogleCalendar,
} from '@/features/clinic/api/doctors.api'
import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { tokenService } from '@/services/token.service'
import { CalendarDays, Loader2, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DoctorConnectorsTabProps {
  doctorId: string
  gcal?: string
  reason?: string
  onGcalHandled: () => void
}

function DoctorCalendarPickerModal({
  doctorId,
  open,
  onClose,
}: {
  doctorId: string
  open: boolean
  onClose: () => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: calendars, isLoading, isError } = useDoctorGoogleCalendarCalendars(doctorId, open)
  const { mutate: selectCalendar, isPending } = useSelectDoctorGoogleCalendar(doctorId)

  const handleSelect = () => {
    if (!selectedId || !calendars) return
    const selected = calendars.find((c) => c.id === selectedId)
    if (!selected) return
    selectCalendar(
      { calendarId: selectedId, calendarName: selected.summary },
      {
        onSuccess: () => {
          setSelectedId(null)
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isPending) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar calendário</DialogTitle>
          <DialogDescription>
            Escolha qual calendário do Google será usado para sincronizar os agendamentos.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                A autorização expirou ou não tem permissões suficientes.
                <br />
                Feche este diálogo e clique em <strong>Vincular</strong> novamente para reconectar.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {calendars?.map((cal) => (
                <li
                  key={cal.id}
                  onClick={() => setSelectedId(cal.id)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                    selectedId === cal.id ? 'bg-muted' : ''
                  }`}
                >
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">
                      {cal.summary}
                      {cal.primary && (
                        <span className="ml-2 text-xs text-muted-foreground">(principal)</span>
                      )}
                    </p>
                    {cal.description && (
                      <p className="truncate text-xs text-muted-foreground">{cal.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSelect} disabled={!selectedId || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DoctorConnectorsTab({ doctorId, gcal, reason, onGcalHandled }: DoctorConnectorsTabProps) {
  const clinicId = tokenService.getActiveClinicId() ?? ''
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const { data, isLoading } = useDoctorConnectors(doctorId)
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectDoctorGoogleCalendar(doctorId)

  useEffect(() => {
    if (gcal === 'pending-calendar-selection') {
      setCalendarPickerOpen(true)
      onGcalHandled()
    } else if (gcal === 'error') {
      toast.error(reason ?? 'Erro ao conectar Google Calendar.')
      onGcalHandled()
    }
  }, [gcal, reason, onGcalHandled])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const { data: result } = await api.get(
        ENDPOINTS.DOCTORS.GOOGLE_CALENDAR_AUTH_URL(clinicId, doctorId),
      )
      window.location.href = result.authUrl
    } catch {
      toast.error('Erro ao iniciar conexão com Google Calendar.')
      setIsConnecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  const isGoogleConnected = data?.googleCalendar ?? false

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Conectores</h2>
          <p className="text-muted-foreground text-sm">
            Conecte seu perfil a outros aplicativos e serviços.
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
                  Sincronize seus agendamentos com o Google Calendar
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
                    onClick={() => disconnect()}
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
                  Receba notificações de agendamento via WhatsApp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" disabled>
                Vincular
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DoctorCalendarPickerModal
        doctorId={doctorId}
        open={calendarPickerOpen}
        onClose={() => setCalendarPickerOpen(false)}
      />
    </>
  )
}

import { useState } from 'react'
import { CalendarDays, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useGoogleCalendarCalendars,
  useSelectGoogleCalendar,
} from '@/features/clinic/api/clinic-settings.api'

interface CalendarPickerModalProps {
  clinicId: string
  open: boolean
  onClose: () => void
}

export function CalendarPickerModal({ clinicId, open, onClose }: CalendarPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: calendars, isLoading } = useGoogleCalendarCalendars(clinicId, open)
  const { mutate: selectCalendar, isPending } = useSelectGoogleCalendar(clinicId)

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

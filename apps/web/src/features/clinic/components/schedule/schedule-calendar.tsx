import { useCallback, useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import type { View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CalendarEvent } from '@/types/doctor.types'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales: { 'pt-BR': ptBR },
})

interface RbcEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  status: 'confirmed' | 'tentative' | 'cancelled'
}

interface ScheduleCalendarProps {
  events: CalendarEvent[]
  isLoading: boolean
  onRangeChange: (start: Date, end: Date) => void
}

const VIEW_LABELS: Record<View, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mês',
  agenda: 'Agenda',
  work_week: 'Semana útil',
}

export function ScheduleCalendar({ events, isLoading, onRangeChange }: ScheduleCalendarProps) {
  const [view, setView] = useState<View>('day')
  const [date, setDate] = useState(new Date())

  const rbcEvents: RbcEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: new Date(e.start),
    end: new Date(e.end),
    allDay: e.allDay,
    status: e.status,
  }))

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (Array.isArray(range)) {
        onRangeChange(range[0], range[range.length - 1])
      } else {
        onRangeChange(range.start, range.end)
      }
    },
    [onRangeChange],
  )

  const handleNavigate = (newDate: Date) => {
    setDate(newDate)
  }

  const handleViewChange = (newView: View) => {
    setView(newView)
  }

  const eventPropGetter = (event: RbcEvent) => {
    const base = 'transition-opacity'
    if (event.status === 'cancelled') {
      return {
        className: `${base} opacity-40`,
        style: { textDecoration: 'line-through' },
      }
    }
    if (event.status === 'tentative') {
      return {
        className: base,
        style: { borderStyle: 'dashed', borderWidth: 2 },
      }
    }
    return { className: base }
  }

  const formats = {
    timeGutterFormat: (date: Date) => format(date, 'HH:mm', { locale: ptBR }),
    eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, 'HH:mm', { locale: ptBR })} – ${format(end, 'HH:mm', { locale: ptBR })}`,
    dayHeaderFormat: (date: Date) =>
      format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }),
    monthHeaderFormat: (date: Date) =>
      format(date, "MMMM 'de' yyyy", { locale: ptBR }),
    weekdayFormat: (date: Date) =>
      format(date, 'EEE', { locale: ptBR }),
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, "dd 'de' MMM", { locale: ptBR })} – ${format(end, "dd 'de' MMM", { locale: ptBR })}`,
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Custom toolbar */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nav = new Date(date)
              if (view === 'day') nav.setDate(nav.getDate() - 1)
              else if (view === 'week' || view === 'work_week') nav.setDate(nav.getDate() - 7)
              else nav.setMonth(nav.getMonth() - 1)
              setDate(nav)
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDate(new Date())}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nav = new Date(date)
              if (view === 'day') nav.setDate(nav.getDate() + 1)
              else if (view === 'week' || view === 'work_week') nav.setDate(nav.getDate() + 7)
              else nav.setMonth(nav.getMonth() + 1)
              setDate(nav)
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="font-semibold text-sm capitalize">
          {view === 'day' && format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          {view === 'week' && format(date, "MMMM 'de' yyyy", { locale: ptBR })}
          {view === 'month' && format(date, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>

        <div className="flex items-center gap-1">
          {(['day', 'week', 'month'] as View[]).map((v) => (
            <Button
              key={v}
              variant={view === v ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewChange(v)}
            >
              {VIEW_LABELS[v]}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="relative flex-1 min-h-0">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 rounded-md">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        <Calendar
          localizer={localizer}
          events={rbcEvents}
          view={view}
          date={date}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onRangeChange={handleRangeChange}
          eventPropGetter={eventPropGetter}
          toolbar={false}
          formats={formats}
          step={30}
          timeslots={2}
          min={new Date(0, 0, 0, 7, 0, 0)}
          max={new Date(0, 0, 0, 21, 0, 0)}
          scrollToTime={new Date(0, 0, 0, 8, 0, 0)}
          style={{ height: '100%' }}
          culture="pt-BR"
        />
      </div>
    </div>
  )
}

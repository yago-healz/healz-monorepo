import { Logger } from '@nestjs/common'
import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ClinicSettingsService } from '../../clinic-settings/clinic-settings.service'
import { GoogleCalendarService } from '../../google-calendar/google-calendar.service'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE ?? 'America/Sao_Paulo'

function getDayOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return DAYS[new Date(year, month - 1, day).getDay()]
}

function generateSlots(timeSlots: Array<{ from: string; to: string }>, duration: number): string[] {
  const slots: string[] = []
  for (const slot of timeSlots) {
    const [fromHour, fromMin] = slot.from.split(':').map(Number)
    const [toHour, toMin] = slot.to.split(':').map(Number)
    let current = fromHour * 60 + fromMin
    const end = toHour * 60 + toMin
    while (current + duration <= end) {
      slots.push(
        `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`,
      )
      current += duration
    }
  }
  return slots
}

/**
 * Converte uma data + hora no timezone da clínica para timestamp UTC (ms).
 */
function toUtcMs(dateStr: string, timeStr: string, timezone: string): number {
  // Construir a string ISO sem timezone
  const localDateTimeStr = `${dateStr}T${timeStr}:00`

  // Descobrir o offset do timezone naquela data
  const probe = new Date(`${dateStr}T12:00:00Z`)
  const offsetMinutes = getTimezoneOffset(timezone, probe)

  // Criar um Date interpretando como UTC, depois ajustar pelo offset
  const utcDate = new Date(localDateTimeStr + 'Z')

  // Converter do timezone local para UTC
  return utcDate.getTime() - offsetMinutes * 60 * 1000
}

/**
 * Retorna offset em minutos: UTC - local
 * Negativo para UTC+, positivo para UTC-
 */
function getTimezoneOffset(timezone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {} as Record<string, string>)

  const localDate = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
  )

  return Math.round((localDate.getTime() - date.getTime()) / (60 * 1000))
}

function collidesWithBusy(
  slotTime: string,
  dateStr: string,
  busySlots: Array<{ start: string; end: string }>,
  duration: number,
  timezone: string,
): boolean {
  const slotStartUtcMs = toUtcMs(dateStr, slotTime, timezone)
  const slotEndUtcMs = slotStartUtcMs + duration * 60 * 1000

  return busySlots.some((busy) => {
    const busyStart = new Date(busy.start).getTime()
    const busyEnd = new Date(busy.end).getTime()
    return slotStartUtcMs < busyEnd && slotEndUtcMs > busyStart
  })
}

export class CheckAvailabilityTool extends StructuredTool {
  name = 'check_availability'
  description = 'Verifica horários disponíveis para agendamento em uma data específica'
  schema = z.object({
    date: z.string().describe('Data no formato YYYY-MM-DD'),
  })

  private readonly logger = new Logger(CheckAvailabilityTool.name)

  constructor(
    private readonly clinicId: string,
    private readonly clinicSettingsService: ClinicSettingsService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {
    super()
  }

  async _call(input: { date: string }): Promise<string> {
    const scheduling = await this.clinicSettingsService.getScheduling(this.clinicId)

    if (!scheduling?.weeklySchedule) {
      return JSON.stringify({ date: input.date, slots: [] })
    }

    // Validar `maxFutureDays`
    const maxFutureDays = scheduling.maxFutureDays ?? 365
    const requestedDate = new Date(`${input.date}T12:00:00Z`)
    const maxDate = new Date(Date.now() + maxFutureDays * 24 * 60 * 60 * 1000)
    if (requestedDate > maxDate) {
      return JSON.stringify({
        date: input.date,
        slots: [],
        reason: 'date_too_far',
      })
    }

    const weeklySchedule = scheduling.weeklySchedule as Array<{
      day: string
      isOpen: boolean
      timeSlots: Array<{ from: string; to: string }>
    }>

    const dayOfWeek = getDayOfWeek(input.date)
    const daySchedule = weeklySchedule.find((d) => d.day === dayOfWeek)

    if (!daySchedule?.isOpen || !daySchedule.timeSlots.length) {
      return JSON.stringify({ date: input.date, slots: [] })
    }

    const duration = scheduling.defaultAppointmentDuration ?? 30
    const candidates = generateSlots(daySchedule.timeSlots, duration)

    // Filtrar slots passados e aplicar minimumAdvanceHours
    const nowMs = Date.now()
    const minAdvanceMs = (scheduling.minimumAdvanceHours ?? 0) * 60 * 60 * 1000

    const futureSlots = candidates.filter((slotTime) => {
      const slotUtcMs = toUtcMs(input.date, slotTime, CLINIC_TIMEZONE)
      return slotUtcMs >= nowMs + minAdvanceMs
    })

    // Buscar busy slots do Google Calendar
    let busySlots: Array<{ start: string; end: string }> = []
    try {
      if (await this.googleCalendarService.isConnected(this.clinicId)) {
        busySlots = await this.googleCalendarService.getFreeBusy(
          this.clinicId,
          new Date(input.date),
          CLINIC_TIMEZONE,
        )
      }
    } catch (err) {
      this.logger.warn(
        `getFreeBusy failed for clinic ${this.clinicId}, ignoring Google Calendar: ${err}`,
      )
    }

    // Buscar specificBlocks para este dia
    const specificBlocks = (scheduling.specificBlocks ?? []) as Array<{
      date: string
      from: string
      to: string
    }>
    const dayBlocks = specificBlocks.filter((b) => b.date === input.date)

    // Filtrar slots: não ocupados + não bloqueados
    const available = futureSlots.filter((slot) => {
      // Verificar colisão com Google Calendar
      if (collidesWithBusy(slot, input.date, busySlots, duration, CLINIC_TIMEZONE)) {
        return false
      }

      // Verificar colisão com bloqueios específicos
      if (
        dayBlocks.some((block) => {
          const [blockFromH, blockFromM] = block.from.split(':').map(Number)
          const [blockToH, blockToM] = block.to.split(':').map(Number)
          const [slotH, slotM] = slot.split(':').map(Number)

          const slotMin = slotH * 60 + slotM
          const blockFromMin = blockFromH * 60 + blockFromM
          const blockToMin = blockToH * 60 + blockToM

          return slotMin >= blockFromMin && slotMin < blockToMin
        })
      ) {
        return false
      }

      return true
    })

    return JSON.stringify({
      date: input.date,
      slots: available.map((time) => ({ time, available: true })),
    })
  }
}

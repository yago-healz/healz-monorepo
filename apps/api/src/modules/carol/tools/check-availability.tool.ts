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
    this.logger.debug(`[CheckAvailabilityTool] Starting availability check for clinic ${this.clinicId} on date ${input.date}`)

    const scheduling = await this.clinicSettingsService.getScheduling(this.clinicId)
    this.logger.debug(`[CheckAvailabilityTool] Scheduling config retrieved:`, {
      weeklyScheduleExists: !!scheduling?.weeklySchedule,
      maxFutureDays: scheduling?.maxFutureDays,
      defaultAppointmentDuration: scheduling?.defaultAppointmentDuration,
      minimumAdvanceHours: scheduling?.minimumAdvanceHours,
      specificBlocksCount: (scheduling?.specificBlocks as any[])?.length ?? 0,
    })

    if (!scheduling?.weeklySchedule) {
      this.logger.warn(`[CheckAvailabilityTool] No weeklySchedule configured for clinic ${this.clinicId}`)
      return JSON.stringify({ date: input.date, slots: [] })
    }

    // Validar `maxFutureDays`
    const maxFutureDays = scheduling.maxFutureDays ?? 365
    const requestedDate = new Date(`${input.date}T12:00:00Z`)
    const maxDate = new Date(Date.now() + maxFutureDays * 24 * 60 * 60 * 1000)
    if (requestedDate > maxDate) {
      this.logger.log(`[CheckAvailabilityTool] Requested date ${input.date} exceeds maxFutureDays (${maxFutureDays} days)`)
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
    this.logger.debug(`[CheckAvailabilityTool] Day schedule for ${dayOfWeek}:`, {
      dayOfWeek,
      isOpen: daySchedule?.isOpen,
      timeSlots: daySchedule?.timeSlots,
    })

    if (!daySchedule?.isOpen || !daySchedule.timeSlots.length) {
      this.logger.log(`[CheckAvailabilityTool] Clinic is closed on ${dayOfWeek} (${input.date})`)
      return JSON.stringify({ date: input.date, slots: [] })
    }

    const duration = scheduling.defaultAppointmentDuration ?? 30
    const candidates = generateSlots(daySchedule.timeSlots, duration)
    this.logger.debug(`[CheckAvailabilityTool] Generated ${candidates.length} candidate slots with duration ${duration}min:`, {
      candidates: candidates.slice(0, 5), // Show first 5 for brevity
      totalCount: candidates.length,
    })

    // Filtrar slots passados e aplicar minimumAdvanceHours
    const nowMs = Date.now()
    const minAdvanceMs = (scheduling.minimumAdvanceHours ?? 0) * 60 * 60 * 1000
    const now = new Date(nowMs)
    this.logger.debug(`[CheckAvailabilityTool] Filtering slots with minimumAdvanceHours:`, {
      minimumAdvanceHours: scheduling.minimumAdvanceHours,
      minAdvanceMs,
      nowUtc: now.toISOString(),
    })

    const futureSlots = candidates.filter((slotTime) => {
      const slotUtcMs = toUtcMs(input.date, slotTime, CLINIC_TIMEZONE)
      const isFuture = slotUtcMs >= nowMs + minAdvanceMs
      return isFuture
    })
    this.logger.debug(`[CheckAvailabilityTool] Future slots after advance hours filter: ${futureSlots.length}`, {
      futureSlots: futureSlots.slice(0, 5),
      totalCount: futureSlots.length,
    })

    // Buscar busy slots do Google Calendar
    let busySlots: Array<{ start: string; end: string }> = []
    const isGcalConnected = await this.googleCalendarService.isConnected(this.clinicId)
    this.logger.log(`[CheckAvailabilityTool] Google Calendar connection status for clinic ${this.clinicId}: ${isGcalConnected}`)

    try {
      if (isGcalConnected) {
        this.logger.debug(`[CheckAvailabilityTool] Fetching busy slots from Google Calendar for ${input.date}`)
        busySlots = await this.googleCalendarService.getFreeBusy(
          this.clinicId,
          new Date(input.date),
          CLINIC_TIMEZONE,
        )
        this.logger.log(`[CheckAvailabilityTool] Retrieved ${busySlots.length} busy slots from Google Calendar`, {
          busySlotsCount: busySlots.length,
          busySlots: busySlots,
        })
      }
    } catch (err) {
      this.logger.error(`[CheckAvailabilityTool] getFreeBusy failed for clinic ${this.clinicId}, ignoring Google Calendar:`, {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
    }

    // Buscar specificBlocks para este dia
    const specificBlocks = (scheduling.specificBlocks ?? []) as Array<{
      date: string
      from: string
      to: string
    }>
    const dayBlocks = specificBlocks.filter((b) => b.date === input.date)
    this.logger.debug(`[CheckAvailabilityTool] Specific blocks for ${input.date}:`, {
      count: dayBlocks.length,
      blocks: dayBlocks,
    })

    // Filtrar slots: não ocupados + não bloqueados
    const available = futureSlots.filter((slot) => {
      // Verificar colisão com Google Calendar
      const collidesGcal = collidesWithBusy(slot, input.date, busySlots, duration, CLINIC_TIMEZONE)
      if (collidesGcal) {
        this.logger.debug(`[CheckAvailabilityTool] Slot ${slot} filtered out: collides with Google Calendar busy time`)
        return false
      }

      // Verificar colisão com bloqueios específicos
      const collidesSpecificBlock = dayBlocks.some((block) => {
        const [blockFromH, blockFromM] = block.from.split(':').map(Number)
        const [blockToH, blockToM] = block.to.split(':').map(Number)
        const [slotH, slotM] = slot.split(':').map(Number)

        const slotMin = slotH * 60 + slotM
        const blockFromMin = blockFromH * 60 + blockFromM
        const blockToMin = blockToH * 60 + blockToM

        return slotMin >= blockFromMin && slotMin < blockToMin
      })

      if (collidesSpecificBlock) {
        this.logger.debug(`[CheckAvailabilityTool] Slot ${slot} filtered out: collides with specific block`)
        return false
      }

      return true
    })

    const result = JSON.stringify({
      date: input.date,
      slots: available.map((time) => ({ time, available: true })),
    })

    this.logger.log(`[CheckAvailabilityTool] Final result: ${available.length} available slots for ${input.date}`, {
      availableSlots: available.slice(0, 10),
      totalAvailable: available.length,
    })

    return result
  }
}

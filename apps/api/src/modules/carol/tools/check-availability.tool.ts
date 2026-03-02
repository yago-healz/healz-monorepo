import { Logger } from '@nestjs/common'
import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ClinicSettingsService } from '../../clinic-settings/clinic-settings.service'
import { GoogleCalendarService } from '../../google-calendar/google-calendar.service'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

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

function collidesWithBusy(
  slotTime: string,
  dateStr: string,
  busySlots: Array<{ start: string; end: string }>,
  duration: number,
): boolean {
  const slotStart = new Date(`${dateStr}T${slotTime}:00`)
  const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000)
  return busySlots.some((busy) => {
    const busyStart = new Date(busy.start)
    const busyEnd = new Date(busy.end)
    return slotStart < busyEnd && slotEnd > busyStart
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

    let busySlots: Array<{ start: string; end: string }> = []
    try {
      if (await this.googleCalendarService.isConnected(this.clinicId)) {
        busySlots = await this.googleCalendarService.getFreeBusy(
          this.clinicId,
          new Date(input.date),
        )
      }
    } catch (err) {
      this.logger.warn(
        `getFreeBusy failed for clinic ${this.clinicId}, ignoring Google Calendar: ${err}`,
      )
    }

    const available = candidates.filter(
      (slot) => !collidesWithBusy(slot, input.date, busySlots, duration),
    )

    return JSON.stringify({
      date: input.date,
      slots: available.map((time) => ({ time, available: true })),
    })
  }
}

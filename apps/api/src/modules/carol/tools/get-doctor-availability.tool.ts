import { Logger } from '@nestjs/common'
import { StructuredTool } from '@langchain/core/tools'
import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../infrastructure/database'
import {
  doctorProfiles,
  doctorClinics,
  doctorClinicSchedules,
  appointmentView,
  users,
} from '../../../infrastructure/database/schema'
import { DoctorGoogleCalendarService } from '../../google-calendar/doctor-google-calendar.service'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const DAYS_PT: Record<string, string> = {
  sunday: 'domingo',
  monday: 'segunda-feira',
  tuesday: 'terça-feira',
  wednesday: 'quarta-feira',
  thursday: 'quinta-feira',
  friday: 'sexta-feira',
  saturday: 'sábado',
}
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

function toUtcMs(dateStr: string, timeStr: string, timezone: string): number {
  const probe = new Date(`${dateStr}T12:00:00Z`)
  const offsetMinutes = getTimezoneOffset(timezone, probe)
  const utcDate = new Date(`${dateStr}T${timeStr}:00Z`)
  return utcDate.getTime() - offsetMinutes * 60 * 1000
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

function collidesWithAppointment(
  slotTime: string,
  dateStr: string,
  appointments: Array<{ scheduledAt: Date; duration: number }>,
  slotDuration: number,
  timezone: string,
): boolean {
  const slotStartMs = toUtcMs(dateStr, slotTime, timezone)
  const slotEndMs = slotStartMs + slotDuration * 60 * 1000
  return appointments.some((apt) => {
    const aptStartMs = apt.scheduledAt.getTime()
    const aptEndMs = aptStartMs + apt.duration * 60 * 1000
    return slotStartMs < aptEndMs && slotEndMs > aptStartMs
  })
}

export class GetDoctorAvailabilityTool extends StructuredTool {
  name = 'get_doctor_availability'
  description =
    'Verifica os horários disponíveis de um médico específico em uma data. ' +
    'Retorna os slots livres considerando a agenda do médico, compromissos no Google Calendar ' +
    'e agendamentos já existentes. Use após identificar o médico desejado com list_doctors.'

  schema = z.object({
    doctorId: z.string().describe('ID do médico (obtido via list_doctors)'),
    date: z.string().describe('Data no formato YYYY-MM-DD'),
  })

  private readonly logger = new Logger(GetDoctorAvailabilityTool.name)

  constructor(
    private readonly clinicId: string,
    private readonly doctorGoogleCalendarService: DoctorGoogleCalendarService,
  ) {
    super()
  }

  async _call(input: { doctorId: string; date: string }): Promise<string> {
    this.logger.debug(
      `[GetDoctorAvailability] Checking availability for doctor ${input.doctorId} on ${input.date}`,
    )

    // 1. VALIDAR MÉDICO
    const [profile] = await db
      .select({ userId: doctorProfiles.userId, isActive: doctorProfiles.isActive })
      .from(doctorProfiles)
      .where(eq(doctorProfiles.id, input.doctorId))
      .limit(1)

    if (!profile) {
      return JSON.stringify({ error: 'Médico não encontrado', doctorId: input.doctorId })
    }

    if (!profile.isActive) {
      return JSON.stringify({ error: 'Médico inativo', doctorId: input.doctorId })
    }

    // Verificar vínculo ativo com a clínica e obter doctorClinicId
    const [link] = await db
      .select({ doctorClinicId: doctorClinics.id })
      .from(doctorClinics)
      .innerJoin(doctorProfiles, eq(doctorProfiles.userId, doctorClinics.doctorId))
      .where(
        and(
          eq(doctorClinics.clinicId, this.clinicId),
          eq(doctorProfiles.id, input.doctorId),
          eq(doctorClinics.isActive, true),
        ),
      )
      .limit(1)

    if (!link) {
      return JSON.stringify({
        error: 'Médico não atende nesta clínica',
        doctorId: input.doctorId,
      })
    }

    // 2. BUSCAR AGENDA DO MÉDICO
    const [schedule] = await db
      .select()
      .from(doctorClinicSchedules)
      .where(eq(doctorClinicSchedules.doctorClinicId, link.doctorClinicId))
      .limit(1)

    if (!schedule) {
      return JSON.stringify({
        doctorId: input.doctorId,
        date: input.date,
        slots: [],
        message: 'Médico sem agenda configurada',
      })
    }

    // Buscar nome do médico
    const [doctorUser] = await db
      .select({ name: users.name })
      .from(users)
      .innerJoin(doctorProfiles, eq(doctorProfiles.userId, users.id))
      .where(eq(doctorProfiles.id, input.doctorId))
      .limit(1)

    const doctorName = doctorUser?.name ?? 'Médico'

    // 3. VALIDAR DATA
    const maxFutureDays = schedule.maxFutureDays ?? 365
    const requestedDate = new Date(`${input.date}T12:00:00Z`)
    const maxDate = new Date(Date.now() + maxFutureDays * 24 * 60 * 60 * 1000)

    if (requestedDate > maxDate) {
      return JSON.stringify({
        doctorId: input.doctorId,
        doctorName,
        date: input.date,
        slots: [],
        message: `Data muito distante. Máximo ${maxFutureDays} dias a partir de hoje.`,
      })
    }

    // 4. VERIFICAR DIA DA SEMANA
    const weeklySchedule = (schedule.weeklySchedule as Array<{
      day: string
      isOpen: boolean
      timeSlots: Array<{ from: string; to: string }>
    }>) ?? []

    const dayOfWeekKey = getDayOfWeek(input.date)
    const dayOfWeekPt = DAYS_PT[dayOfWeekKey] ?? dayOfWeekKey
    const daySchedule = weeklySchedule.find((d) => d.day === dayOfWeekKey)

    if (!daySchedule?.isOpen || !daySchedule.timeSlots?.length) {
      return JSON.stringify({
        doctorId: input.doctorId,
        doctorName,
        date: input.date,
        dayOfWeek: dayOfWeekPt,
        slots: [],
        message: 'Médico não atende neste dia',
      })
    }

    // 5. GERAR SLOTS CANDIDATOS
    const duration = schedule.defaultAppointmentDuration ?? 30
    const candidates = generateSlots(daySchedule.timeSlots, duration)

    // 6. FILTRAR SLOTS PASSADOS + minimumAdvanceHours
    const nowMs = Date.now()
    const minAdvanceMs = (schedule.minimumAdvanceHours ?? 0) * 60 * 60 * 1000

    const futureSlots = candidates.filter((slotTime) => {
      const slotUtcMs = toUtcMs(input.date, slotTime, CLINIC_TIMEZONE)
      return slotUtcMs >= nowMs + minAdvanceMs
    })

    // 7. FILTRAR POR SPECIFIC BLOCKS
    const specificBlocks = (schedule.specificBlocks ?? []) as Array<{
      date: string
      from: string
      to: string
    }>
    const dayBlocks = specificBlocks.filter((b) => b.date === input.date)

    const afterBlocksFilter = futureSlots.filter((slot) => {
      return !dayBlocks.some((block) => {
        const [blockFromH, blockFromM] = block.from.split(':').map(Number)
        const [blockToH, blockToM] = block.to.split(':').map(Number)
        const [slotH, slotM] = slot.split(':').map(Number)
        const slotMin = slotH * 60 + slotM
        const blockFromMin = blockFromH * 60 + blockFromM
        const blockToMin = blockToH * 60 + blockToM
        return slotMin >= blockFromMin && slotMin < blockToMin
      })
    })

    // 8. FILTRAR POR GOOGLE CALENDAR
    let busySlots: Array<{ start: string; end: string }> = []
    try {
      const isConnected = await this.doctorGoogleCalendarService.isConnected(
        this.clinicId,
        input.doctorId,
      )
      if (isConnected) {
        busySlots = await this.doctorGoogleCalendarService.getFreeBusy(
          this.clinicId,
          input.doctorId,
          new Date(input.date),
          CLINIC_TIMEZONE,
        )
        this.logger.debug(
          `[GetDoctorAvailability] ${busySlots.length} busy slots from Google Calendar`,
        )
      }
    } catch (err) {
      this.logger.error(
        `[GetDoctorAvailability] getFreeBusy failed for doctor ${input.doctorId}: ${err}`,
      )
    }

    const afterGcalFilter = afterBlocksFilter.filter(
      (slot) => !collidesWithBusy(slot, input.date, busySlots, duration, CLINIC_TIMEZONE),
    )

    // 9. FILTRAR POR AGENDAMENTOS EXISTENTES
    // Usa range UTC com buffer de 14h para cobrir todos os fusos horários
    const dayStartUtc = new Date(`${input.date}T00:00:00Z`)
    dayStartUtc.setHours(dayStartUtc.getHours() - 14)
    const dayEndUtc = new Date(`${input.date}T23:59:59Z`)
    dayEndUtc.setHours(dayEndUtc.getHours() + 14)

    const existingAppointments = await db
      .select({
        scheduledAt: appointmentView.scheduledAt,
        duration: appointmentView.duration,
      })
      .from(appointmentView)
      .where(
        and(
          eq(appointmentView.doctorId, profile.userId),
          gte(appointmentView.scheduledAt, dayStartUtc),
          lte(appointmentView.scheduledAt, dayEndUtc),
          inArray(appointmentView.status, ['scheduled', 'confirmed']),
        ),
      )

    const available = afterGcalFilter.filter(
      (slot) =>
        !collidesWithAppointment(slot, input.date, existingAppointments, duration, CLINIC_TIMEZONE),
    )

    this.logger.log(
      `[GetDoctorAvailability] ${available.length} slots available for doctor ${input.doctorId} on ${input.date}`,
    )

    return JSON.stringify({
      doctorId: input.doctorId,
      doctorName,
      date: input.date,
      dayOfWeek: dayOfWeekPt,
      slots: available.map((time) => ({ time, available: true })),
      appointmentDuration: duration,
    })
  }
}

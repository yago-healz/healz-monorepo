import { Logger } from '@nestjs/common'
import { StructuredTool } from '@langchain/core/tools'
import { and, eq, gte, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../infrastructure/database'
import {
  appointmentView,
  doctorProfiles,
  patientContacts,
  users,
} from '../../../infrastructure/database/schema'

const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE ?? 'America/Sao_Paulo'

function formatInTimezone(date: Date, timezone: string): { date: string; time: string } {
  const datePart = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)

  const timePart = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)

  return { date: datePart, time: timePart }
}

export class GetPatientAppointmentsTool extends StructuredTool {
  name = 'get_patient_appointments'
  description =
    'Busca os próximos agendamentos de um paciente nesta clínica. ' +
    'Use quando o paciente perguntar sobre consultas marcadas ou quando precisar ' +
    'verificar agendamentos existentes antes de criar um novo.'

  schema = z.object({
    contactId: z
      .string()
      .describe('ID do contato do paciente (obtido via find_or_create_patient)'),
    status: z
      .enum(['upcoming', 'all'])
      .optional()
      .default('upcoming')
      .describe(
        'upcoming: apenas futuros agendados/confirmados. all: inclui passados e cancelados.',
      ),
  })

  private readonly logger = new Logger(GetPatientAppointmentsTool.name)

  constructor(private readonly clinicId: string) {
    super()
  }

  async _call(input: { contactId: string; status?: string }): Promise<string> {
    this.logger.debug(
      `[GetPatientAppointments] Looking up appointments for contact ${input.contactId} in clinic ${this.clinicId}`,
    )

    // 1. Resolve patientId from contactId
    const [contact] = await db
      .select({ patientId: patientContacts.patientId, id: patientContacts.id })
      .from(patientContacts)
      .where(
        and(
          eq(patientContacts.id, input.contactId),
          eq(patientContacts.clinicId, this.clinicId),
        ),
      )
      .limit(1)

    if (!contact) {
      return JSON.stringify({ appointments: [], total: 0 })
    }

    // Use patientId if linked, otherwise fall back to contactId (same pattern as CreateAppointmentTool)
    const patientId = contact.patientId ?? contact.id

    // 2. Build query conditions
    const conditions = [
      eq(appointmentView.patientId, patientId),
      eq(appointmentView.clinicId, this.clinicId),
    ]

    const filterUpcoming = !input.status || input.status === 'upcoming'
    if (filterUpcoming) {
      conditions.push(
        gte(appointmentView.scheduledAt, new Date()),
        inArray(appointmentView.status, ['scheduled', 'confirmed']),
      )
    }

    // 3. Fetch appointments
    const rows = await db
      .select({
        id: appointmentView.id,
        scheduledAt: appointmentView.scheduledAt,
        duration: appointmentView.duration,
        status: appointmentView.status,
        reason: appointmentView.reason,
        doctorId: appointmentView.doctorId,
      })
      .from(appointmentView)
      .where(and(...conditions))
      .orderBy(appointmentView.scheduledAt)
      .limit(10)

    if (!rows.length) {
      return JSON.stringify({ appointments: [], total: 0 })
    }

    // 4. Enrich with doctor name and specialty
    const doctorUserIds = [...new Set(rows.map((r) => r.doctorId))]

    const doctorInfoRows = await db
      .select({
        userId: users.id,
        name: users.name,
        specialty: doctorProfiles.specialty,
      })
      .from(users)
      .innerJoin(doctorProfiles, eq(doctorProfiles.userId, users.id))
      .where(inArray(users.id, doctorUserIds))

    const doctorMap = new Map(doctorInfoRows.map((d) => [d.userId, d]))

    // 5. Format output
    const appointments = rows.map((row) => {
      const doctor = doctorMap.get(row.doctorId)
      const { date, time } = formatInTimezone(row.scheduledAt, CLINIC_TIMEZONE)
      return {
        appointmentId: row.id,
        doctorName: doctor?.name ?? 'Médico',
        specialty: doctor?.specialty ?? null,
        date,
        time,
        duration: row.duration,
        status: row.status,
        reason: row.reason ?? null,
      }
    })

    this.logger.debug(
      `[GetPatientAppointments] Found ${appointments.length} appointments for contact ${input.contactId}`,
    )
    return JSON.stringify({ appointments, total: appointments.length })
  }
}

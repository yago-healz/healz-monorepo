import { Logger } from '@nestjs/common'
import { StructuredTool } from '@langchain/core/tools'
import { and, eq, ilike } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../infrastructure/database'
import {
  doctorProfiles,
  doctorClinics,
  doctorClinicProcedures,
  procedures,
  patientContacts,
  clinics,
  users,
} from '../../../infrastructure/database/schema'
import { AppointmentService } from '../../appointment/application/appointment.service'

const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE ?? 'America/Sao_Paulo'

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
    .reduce(
      (acc, part) => {
        acc[part.type] = part.value
        return acc
      },
      {} as Record<string, string>,
    )
  const localDate = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
  )
  return Math.round((localDate.getTime() - date.getTime()) / (60 * 1000))
}

function toUtc(dateStr: string, timeStr: string, timezone: string): Date {
  const probe = new Date(`${dateStr}T12:00:00Z`)
  const offsetMinutes = getTimezoneOffset(timezone, probe)
  const utcDate = new Date(`${dateStr}T${timeStr}:00Z`)
  return new Date(utcDate.getTime() - offsetMinutes * 60 * 1000)
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export class CreateAppointmentTool extends StructuredTool {
  name = 'create_appointment'
  description = `Cria um agendamento real para o paciente com um médico específico.
IMPORTANTE: Antes de usar esta tool, você DEVE:
1. Ter o doctorId (via list_doctors)
2. Ter verificado disponibilidade (via get_doctor_availability)
3. Ter os dados do paciente (via find_or_create_patient)
4. Ter confirmado todos os dados com o paciente`

  schema = z.object({
    doctorId: z.string().describe('UUID do médico retornado pelo list_doctors (ex: "550e8400-e29b-41d4-a716-446655440000"). Use o valor EXATO retornado, não modifique.'),
    contactId: z.string().describe('ID do contato do paciente (obtido via find_or_create_patient)'),
    date: z.string().describe('Data no formato YYYY-MM-DD'),
    time: z.string().describe('Horário no formato HH:MM'),
    procedure: z.string().optional().describe('Nome do procedimento/serviço'),
    notes: z.string().optional().describe('Observações adicionais do paciente'),
  })

  private readonly logger = new Logger(CreateAppointmentTool.name)

  constructor(
    private readonly clinicId: string,
    private readonly appointmentService: AppointmentService,
  ) {
    super()
  }

  async _call(input: {
    doctorId: string
    contactId: string
    date: string
    time: string
    procedure?: string
    notes?: string
  }): Promise<string> {
    this.logger.log(`[CreateAppointment] Creating appointment for clinic ${this.clinicId}`, {
      doctorId: input.doctorId,
      contactId: input.contactId,
      date: input.date,
      time: input.time,
      procedure: input.procedure,
    })

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(input.doctorId)) {
      return JSON.stringify({
        success: false,
        error: `doctorId inválido: "${input.doctorId}" não é um UUID. Use o valor exato do campo doctorId retornado por list_doctors.`,
      })
    }

    try {
      // 1. RESOLVER MÉDICO
      const [profile] = await db
        .select({ userId: doctorProfiles.userId, isActive: doctorProfiles.isActive })
        .from(doctorProfiles)
        .where(eq(doctorProfiles.id, input.doctorId))
        .limit(1)

      if (!profile) {
        return JSON.stringify({ success: false, error: 'Médico não encontrado.' })
      }
      if (!profile.isActive) {
        return JSON.stringify({ success: false, error: 'Médico inativo.' })
      }

      const [link] = await db
        .select({
          doctorClinicId: doctorClinics.id,
          defaultDuration: doctorClinics.defaultDuration,
          isActive: doctorClinics.isActive,
        })
        .from(doctorClinics)
        .where(and(eq(doctorClinics.doctorId, profile.userId), eq(doctorClinics.clinicId, this.clinicId)))
        .limit(1)

      if (!link || !link.isActive) {
        return JSON.stringify({ success: false, error: 'Médico não atende nesta clínica.' })
      }

      const [doctorUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, profile.userId))
        .limit(1)

      const doctorName = doctorUser?.name ?? 'Médico'

      // 2. RESOLVER PACIENTE
      // Opção A: usa contactId como patientId quando patientId formal não existe
      const [contact] = await db
        .select({ id: patientContacts.id, patientId: patientContacts.patientId })
        .from(patientContacts)
        .where(and(eq(patientContacts.id, input.contactId), eq(patientContacts.clinicId, this.clinicId)))
        .limit(1)

      if (!contact) {
        return JSON.stringify({ success: false, error: 'Contato do paciente não encontrado.' })
      }

      const patientId = contact.patientId ?? contact.id

      // 3. RESOLVER TENANT
      const [clinic] = await db
        .select({ organizationId: clinics.organizationId })
        .from(clinics)
        .where(eq(clinics.id, this.clinicId))
        .limit(1)

      if (!clinic) {
        return JSON.stringify({ success: false, error: 'Clínica não encontrada.' })
      }

      // 4. DETERMINAR DURAÇÃO
      let duration = link.defaultDuration

      if (input.procedure) {
        const [proc] = await db
          .select({
            durationOverride: doctorClinicProcedures.durationOverride,
            defaultDuration: procedures.defaultDuration,
          })
          .from(doctorClinicProcedures)
          .innerJoin(procedures, eq(procedures.id, doctorClinicProcedures.procedureId))
          .where(
            and(
              eq(doctorClinicProcedures.doctorClinicId, link.doctorClinicId),
              eq(doctorClinicProcedures.isActive, true),
              ilike(procedures.name, input.procedure),
            ),
          )
          .limit(1)

        if (proc) {
          duration = proc.durationOverride ?? proc.defaultDuration
        }
      }

      // 5. CALCULAR scheduledAt em UTC
      const scheduledAt = toUtc(input.date, input.time, CLINIC_TIMEZONE)

      // 6. CHAMAR AppointmentService.schedule()
      const appointmentId = await this.appointmentService.schedule({
        patientId,
        tenantId: clinic.organizationId,
        clinicId: this.clinicId,
        doctorId: profile.userId,
        scheduledAt,
        duration,
        reason: input.procedure ?? 'Consulta agendada via Carol',
        notes: input.notes,
      })

      this.logger.log(`[CreateAppointment] Appointment created: ${appointmentId}`)

      return JSON.stringify({
        success: true,
        appointmentId,
        doctor: doctorName,
        date: formatDate(input.date),
        time: input.time,
        duration,
        procedure: input.procedure,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      this.logger.error(`[CreateAppointment] Failed: ${msg}`)

      if (msg === 'Time slot not available') {
        return JSON.stringify({
          success: false,
          error: 'Este horário não está mais disponível. Por favor, escolha outro horário.',
        })
      }

      return JSON.stringify({
        success: false,
        error: 'Não foi possível criar o agendamento. Tente novamente ou entre em contato com a clínica.',
      })
    }
  }
}

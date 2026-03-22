import { Logger } from '@nestjs/common'
import { StructuredTool } from '@langchain/core/tools'
import { and, eq, ilike, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../infrastructure/database'
import {
  doctorClinics,
  doctorProfiles,
  doctorClinicProcedures,
  procedures,
  users,
} from '../../../infrastructure/database/schema'

function normalizeSpecialtySearch(term: string): string {
  const cleaned = term
    .toLowerCase()
    .replace(/logista$/, '')
    .replace(/logia$/, '')
    .replace(/ista$/, '')
    .replace(/ia$/, '')
  return cleaned.length >= 4 ? cleaned : term.toLowerCase()
}

export class ListDoctorsTool extends StructuredTool {
  name = 'list_doctors'
  description =
    'Lista os médicos que atendem nesta clínica. Pode filtrar por nome, especialidade ou procedimento. ' +
    'Use quando o paciente perguntar sobre médicos, especialidades, ou quando precisar encontrar um profissional para determinado procedimento.'

  schema = z.object({
    name: z
      .string()
      .optional()
      .describe('Nome ou parte do nome do médico (ex: "Ricardo", "Dra. Vitória")'),
    specialty: z
      .string()
      .optional()
      .describe('Especialidade desejada (ex: "oftalmologista", "dermatologista", "cardiologia")'),
    procedure: z
      .string()
      .optional()
      .describe('Procedimento/serviço desejado (ex: "limpeza de pele", "consulta geral")'),
  })

  private readonly logger = new Logger(ListDoctorsTool.name)

  constructor(private readonly clinicId: string) {
    super()
  }

  async _call(input: { name?: string; specialty?: string; procedure?: string }): Promise<string> {
    this.logger.debug(`[ListDoctors] Fetching doctors for clinic ${this.clinicId}`, { input })

    const conditions = [
      eq(doctorClinics.clinicId, this.clinicId),
      eq(doctorClinics.isActive, true),
      eq(doctorProfiles.isActive, true),
    ]

    if (input.name) {
      conditions.push(ilike(users.name, `%${input.name}%`))
    }

    if (input.specialty) {
      const root = normalizeSpecialtySearch(input.specialty)
      conditions.push(ilike(doctorProfiles.specialty, `%${root}%`))
    }

    const doctorRows = await db
      .select({
        doctorClinicId: doctorClinics.id,
        doctorId: doctorProfiles.id,
        name: users.name,
        specialty: doctorProfiles.specialty,
        crm: doctorProfiles.crm,
        bio: doctorProfiles.bio,
      })
      .from(doctorClinics)
      .innerJoin(doctorProfiles, eq(doctorProfiles.userId, doctorClinics.doctorId))
      .innerJoin(users, eq(users.id, doctorClinics.doctorId))
      .where(and(...conditions))

    if (!doctorRows.length) {
      this.logger.debug(`[ListDoctors] No doctors found for clinic ${this.clinicId}`)
      return JSON.stringify({ doctors: [], total: 0 })
    }

    const doctorClinicIds = doctorRows.map((d) => d.doctorClinicId)

    const procedureRows = await db
      .select({
        doctorClinicId: doctorClinicProcedures.doctorClinicId,
        name: procedures.name,
        category: procedures.category,
        price: doctorClinicProcedures.price,
        duration: procedures.defaultDuration,
        durationOverride: doctorClinicProcedures.durationOverride,
      })
      .from(doctorClinicProcedures)
      .innerJoin(procedures, eq(procedures.id, doctorClinicProcedures.procedureId))
      .where(
        and(
          inArray(doctorClinicProcedures.doctorClinicId, doctorClinicIds),
          eq(doctorClinicProcedures.isActive, true),
          eq(procedures.isActive, true),
        ),
      )

    const procsByDoctorClinic = new Map<string, typeof procedureRows>()
    for (const row of procedureRows) {
      const list = procsByDoctorClinic.get(row.doctorClinicId) ?? []
      list.push(row)
      procsByDoctorClinic.set(row.doctorClinicId, list)
    }

    let doctors = doctorRows.map((doctor) => {
      const procs = procsByDoctorClinic.get(doctor.doctorClinicId) ?? []
      return {
        doctorId: doctor.doctorId,
        name: doctor.name,
        specialty: doctor.specialty ?? null,
        crm: doctor.crm ?? null,
        bio: doctor.bio ?? null,
        procedures: procs.map((p) => ({
          name: p.name,
          category: p.category ?? null,
          price: p.price ? `R$ ${Number(p.price).toFixed(2)}` : null,
          duration: p.durationOverride ?? p.duration,
        })),
      }
    })

    if (input.procedure) {
      const procTerm = input.procedure.toLowerCase()
      doctors = doctors.filter((d) =>
        d.procedures.some((p) => p.name.toLowerCase().includes(procTerm)),
      )
    }

    this.logger.debug(`[ListDoctors] Returning ${doctors.length} doctors`)
    return JSON.stringify({ doctors, total: doctors.length })
  }
}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../infrastructure/database'
import {
  users,
  userClinicRoles,
  doctorProfiles,
  doctorClinics,
  doctorClinicProcedures,
  doctorClinicSchedules,
  procedures,
  clinics,
} from '../../infrastructure/database/schema'
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto'
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto'
import { UpdateDoctorClinicDto } from './dto/update-doctor-clinic.dto'
import { LinkProcedureDto } from './dto/link-procedure.dto'
import { UpdateDoctorProcedureDto } from './dto/update-doctor-procedure.dto'
import { CreateAndLinkProcedureDto } from './dto/create-and-link-procedure.dto'
import { DoctorProfileResponseDto } from './dto/doctor-profile-response.dto'
import { ClinicForDoctorResponseDto } from './dto/doctor-clinic-list-response.dto'
import { DoctorScheduleDto, GetDoctorScheduleResponseDto } from './dto/doctor-schedule.dto'
import { ProceduresService } from '../procedures/procedures.service'

@Injectable()
export class DoctorService {
  constructor(private readonly proceduresService: ProceduresService) {}
  async create(clinicId: string, dto: CreateDoctorProfileDto): Promise<DoctorProfileResponseDto> {
    // Verifica se o user existe e tem role "doctor" nesta clínica
    const userRole = await db
      .select({ userId: userClinicRoles.userId })
      .from(userClinicRoles)
      .where(
        and(
          eq(userClinicRoles.userId, dto.userId),
          eq(userClinicRoles.clinicId, clinicId),
          eq(userClinicRoles.role, 'doctor'),
        ),
      )
      .limit(1)

    if (userRole.length === 0) {
      throw new BadRequestException(
        'Usuário não encontrado ou não possui role "doctor" nesta clínica',
      )
    }

    // Verifica se já existe vínculo ativo nesta clínica
    const existingLink = await db
      .select()
      .from(doctorClinics)
      .where(
        and(
          eq(doctorClinics.doctorId, dto.userId),
          eq(doctorClinics.clinicId, clinicId),
        ),
      )
      .limit(1)

    if (existingLink.length > 0) {
      throw new ConflictException('Médico já vinculado a esta clínica')
    }

    // Cria ou reusa doctor_profiles (1:1 com user)
    let profileId: string
    const existingProfile = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, dto.userId))
      .limit(1)

    if (existingProfile.length > 0) {
      profileId = existingProfile[0].id
      // Atualiza dados do perfil se fornecidos
      await db
        .update(doctorProfiles)
        .set({
          crm: dto.crm ?? existingProfile[0].crm,
          specialty: dto.specialty ?? existingProfile[0].specialty,
          bio: dto.bio ?? existingProfile[0].bio,
          photoUrl: dto.photoUrl ?? existingProfile[0].photoUrl,
          updatedAt: new Date(),
        })
        .where(eq(doctorProfiles.id, profileId))
    } else {
      const [created] = await db
        .insert(doctorProfiles)
        .values({
          userId: dto.userId,
          crm: dto.crm ?? null,
          specialty: dto.specialty ?? null,
          bio: dto.bio ?? null,
          photoUrl: dto.photoUrl ?? null,
        })
        .returning()
      profileId = created.id
    }

    // Cria vínculo doctor_clinics
    const [link] = await db
      .insert(doctorClinics)
      .values({
        doctorId: dto.userId,
        clinicId,
      })
      .returning()

    return this.findOne(clinicId, profileId)
  }

  async findAll(clinicId: string): Promise<DoctorProfileResponseDto[]> {
    const rows = await db
      .select({
        profileId: doctorProfiles.id,
        userId: doctorProfiles.userId,
        crm: doctorProfiles.crm,
        specialty: doctorProfiles.specialty,
        bio: doctorProfiles.bio,
        photoUrl: doctorProfiles.photoUrl,
        profileIsActive: doctorProfiles.isActive,
        userName: users.name,
        userEmail: users.email,
        linkId: doctorClinics.id,
        defaultDuration: doctorClinics.defaultDuration,
        notes: doctorClinics.notes,
        linkIsActive: doctorClinics.isActive,
      })
      .from(doctorClinics)
      .innerJoin(doctorProfiles, eq(doctorClinics.doctorId, doctorProfiles.userId))
      .innerJoin(users, eq(doctorProfiles.userId, users.id))
      .where(eq(doctorClinics.clinicId, clinicId))

    return rows.map((row) => ({
      id: row.profileId,
      userId: row.userId,
      name: row.userName,
      email: row.userEmail,
      crm: row.crm,
      specialty: row.specialty,
      bio: row.bio,
      photoUrl: row.photoUrl,
      isActive: row.profileIsActive,
      doctorClinic: {
        id: row.linkId,
        defaultDuration: row.defaultDuration,
        notes: row.notes,
        isActive: row.linkIsActive,
      },
    }))
  }

  async findOne(clinicId: string, doctorId: string): Promise<DoctorProfileResponseDto> {
    const rows = await db
      .select({
        profileId: doctorProfiles.id,
        userId: doctorProfiles.userId,
        crm: doctorProfiles.crm,
        specialty: doctorProfiles.specialty,
        bio: doctorProfiles.bio,
        photoUrl: doctorProfiles.photoUrl,
        profileIsActive: doctorProfiles.isActive,
        userName: users.name,
        userEmail: users.email,
        linkId: doctorClinics.id,
        defaultDuration: doctorClinics.defaultDuration,
        notes: doctorClinics.notes,
        linkIsActive: doctorClinics.isActive,
      })
      .from(doctorClinics)
      .innerJoin(doctorProfiles, eq(doctorClinics.doctorId, doctorProfiles.userId))
      .innerJoin(users, eq(doctorProfiles.userId, users.id))
      .where(
        and(
          eq(doctorClinics.clinicId, clinicId),
          eq(doctorProfiles.id, doctorId),
        ),
      )
      .limit(1)

    if (rows.length === 0) {
      throw new NotFoundException('Médico não encontrado nesta clínica')
    }

    const row = rows[0]
    return {
      id: row.profileId,
      userId: row.userId,
      name: row.userName,
      email: row.userEmail,
      crm: row.crm,
      specialty: row.specialty,
      bio: row.bio,
      photoUrl: row.photoUrl,
      isActive: row.profileIsActive,
      doctorClinic: {
        id: row.linkId,
        defaultDuration: row.defaultDuration,
        notes: row.notes,
        isActive: row.linkIsActive,
      },
    }
  }

  async update(
    clinicId: string,
    doctorId: string,
    dto: UpdateDoctorProfileDto,
  ): Promise<DoctorProfileResponseDto> {
    // Verifica que o médico pertence à clínica
    await this.findOne(clinicId, doctorId)

    await db
      .update(doctorProfiles)
      .set({
        ...(dto.crm !== undefined && { crm: dto.crm }),
        ...(dto.specialty !== undefined && { specialty: dto.specialty }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(doctorProfiles.id, doctorId))

    return this.findOne(clinicId, doctorId)
  }

  async deactivate(clinicId: string, doctorId: string): Promise<{ success: boolean }> {
    // Verifica que o médico pertence à clínica e obtém o userId
    const doctor = await this.findOne(clinicId, doctorId)

    await db
      .update(doctorClinics)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(doctorClinics.doctorId, doctor.userId),
          eq(doctorClinics.clinicId, clinicId),
        ),
      )

    return { success: true }
  }

  async updateLink(
    clinicId: string,
    doctorId: string,
    dto: UpdateDoctorClinicDto,
    requestingUserId?: string,
  ): Promise<DoctorProfileResponseDto> {
    // Verifica que o médico pertence à clínica
    const doctor = await this.findOne(clinicId, doctorId)

    // Se quem edita é o próprio médico, ignorar isActive (não pode se desativar)
    const isSelf = requestingUserId !== undefined && doctor.userId === requestingUserId

    await db
      .update(doctorClinics)
      .set({
        ...(dto.defaultDuration !== undefined && { defaultDuration: dto.defaultDuration }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(!isSelf && dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(doctorClinics.doctorId, doctor.userId),
          eq(doctorClinics.clinicId, clinicId),
        ),
      )

    return this.findOne(clinicId, doctorId)
  }

  // ── Doctor Clinic Procedures ──────────────────────────────────────────────

  private async getDoctorClinicId(clinicId: string, doctorProfileId: string): Promise<string> {
    const rows = await db
      .select({ doctorClinicId: doctorClinics.id })
      .from(doctorClinics)
      .innerJoin(doctorProfiles, eq(doctorClinics.doctorId, doctorProfiles.userId))
      .where(
        and(
          eq(doctorProfiles.id, doctorProfileId),
          eq(doctorClinics.clinicId, clinicId),
        ),
      )
      .limit(1)

    if (rows.length === 0) {
      throw new NotFoundException('Vínculo médico↔clínica não encontrado')
    }

    return rows[0].doctorClinicId
  }

  async linkProcedure(clinicId: string, doctorId: string, dto: LinkProcedureDto) {
    const doctorClinicId = await this.getDoctorClinicId(clinicId, doctorId)

    // Valida que o procedimento pertence à mesma clínica
    const [procedure] = await db
      .select({ id: procedures.id, defaultDuration: procedures.defaultDuration })
      .from(procedures)
      .where(and(eq(procedures.id, dto.procedureId), eq(procedures.clinicId, clinicId)))
      .limit(1)

    if (!procedure) {
      throw new BadRequestException('Procedimento não encontrado nesta clínica')
    }

    // Verifica duplicidade
    const existing = await db
      .select({ id: doctorClinicProcedures.id })
      .from(doctorClinicProcedures)
      .where(
        and(
          eq(doctorClinicProcedures.doctorClinicId, doctorClinicId),
          eq(doctorClinicProcedures.procedureId, dto.procedureId),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      throw new ConflictException('Procedimento já vinculado a este médico nesta clínica')
    }

    const [created] = await db
      .insert(doctorClinicProcedures)
      .values({
        doctorClinicId,
        procedureId: dto.procedureId,
        price: dto.price !== undefined ? String(dto.price) : null,
        durationOverride: dto.durationOverride ?? null,
      })
      .returning()

    return this.buildProcedureResponse(created, procedure.defaultDuration)
  }

  async createAndLinkProcedure(clinicId: string, doctorId: string, dto: CreateAndLinkProcedureDto) {
    const procedure = await this.proceduresService.create(clinicId, {
      name: dto.name,
      description: dto.description,
      category: dto.category,
      defaultDuration: dto.defaultDuration,
    })

    return this.linkProcedure(clinicId, doctorId, {
      procedureId: procedure.id,
      price: dto.price,
      durationOverride: dto.durationOverride,
    })
  }

  async listProcedures(clinicId: string, doctorId: string) {
    const doctorClinicId = await this.getDoctorClinicId(clinicId, doctorId)

    const rows = await db
      .select({
        id: doctorClinicProcedures.id,
        procedureId: doctorClinicProcedures.procedureId,
        procedureName: procedures.name,
        procedureCategory: procedures.category,
        procedureDefaultDuration: procedures.defaultDuration,
        price: doctorClinicProcedures.price,
        durationOverride: doctorClinicProcedures.durationOverride,
        isActive: doctorClinicProcedures.isActive,
      })
      .from(doctorClinicProcedures)
      .innerJoin(procedures, eq(doctorClinicProcedures.procedureId, procedures.id))
      .where(eq(doctorClinicProcedures.doctorClinicId, doctorClinicId))

    return rows.map((row) => ({
      id: row.id,
      procedureId: row.procedureId,
      procedureName: row.procedureName,
      procedureCategory: row.procedureCategory ?? null,
      procedureDefaultDuration: row.procedureDefaultDuration,
      price: row.price !== null ? Number(row.price) : null,
      durationOverride: row.durationOverride ?? null,
      effectiveDuration: row.durationOverride ?? row.procedureDefaultDuration,
      isActive: row.isActive,
    }))
  }

  async updateProcedure(
    clinicId: string,
    doctorId: string,
    procedureId: string,
    dto: UpdateDoctorProcedureDto,
  ) {
    const doctorClinicId = await this.getDoctorClinicId(clinicId, doctorId)

    const [existing] = await db
      .select({ id: doctorClinicProcedures.id })
      .from(doctorClinicProcedures)
      .where(
        and(
          eq(doctorClinicProcedures.id, procedureId),
          eq(doctorClinicProcedures.doctorClinicId, doctorClinicId),
        ),
      )
      .limit(1)

    if (!existing) {
      throw new NotFoundException('Vínculo procedimento↔médico não encontrado')
    }

    await db
      .update(doctorClinicProcedures)
      .set({
        ...(dto.price !== undefined && { price: String(dto.price) }),
        ...(dto.durationOverride !== undefined && { durationOverride: dto.durationOverride }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(doctorClinicProcedures.id, procedureId))

    const [updated] = await db
      .select({
        id: doctorClinicProcedures.id,
        procedureId: doctorClinicProcedures.procedureId,
        procedureName: procedures.name,
        procedureCategory: procedures.category,
        procedureDefaultDuration: procedures.defaultDuration,
        price: doctorClinicProcedures.price,
        durationOverride: doctorClinicProcedures.durationOverride,
        isActive: doctorClinicProcedures.isActive,
      })
      .from(doctorClinicProcedures)
      .innerJoin(procedures, eq(doctorClinicProcedures.procedureId, procedures.id))
      .where(eq(doctorClinicProcedures.id, procedureId))
      .limit(1)

    return {
      id: updated.id,
      procedureId: updated.procedureId,
      procedureName: updated.procedureName,
      procedureCategory: updated.procedureCategory ?? null,
      procedureDefaultDuration: updated.procedureDefaultDuration,
      price: updated.price !== null ? Number(updated.price) : null,
      durationOverride: updated.durationOverride ?? null,
      effectiveDuration: updated.durationOverride ?? updated.procedureDefaultDuration,
      isActive: updated.isActive,
    }
  }

  async unlinkProcedure(clinicId: string, doctorId: string, procedureId: string) {
    const doctorClinicId = await this.getDoctorClinicId(clinicId, doctorId)

    const [existing] = await db
      .select({ id: doctorClinicProcedures.id })
      .from(doctorClinicProcedures)
      .where(
        and(
          eq(doctorClinicProcedures.id, procedureId),
          eq(doctorClinicProcedures.doctorClinicId, doctorClinicId),
        ),
      )
      .limit(1)

    if (!existing) {
      throw new NotFoundException('Vínculo procedimento↔médico não encontrado')
    }

    await db
      .update(doctorClinicProcedures)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(doctorClinicProcedures.id, procedureId))

    return { success: true }
  }

  private buildProcedureResponse(
    dcp: { id: string; procedureId: string; price: string | null; durationOverride: number | null; isActive: boolean },
    procedureDefaultDuration: number,
  ) {
    return {
      id: dcp.id,
      procedureId: dcp.procedureId,
      price: dcp.price !== null ? Number(dcp.price) : null,
      durationOverride: dcp.durationOverride ?? null,
      effectiveDuration: dcp.durationOverride ?? procedureDefaultDuration,
      isActive: dcp.isActive,
    }
  }

  // ── Doctor Clinic Schedules ───────────────────────────────────────────────

  async getSchedule(clinicId: string, doctorId: string): Promise<GetDoctorScheduleResponseDto> {
    const doctorClinicId = await this.getDoctorClinicId(clinicId, doctorId)

    const [schedule] = await db
      .select()
      .from(doctorClinicSchedules)
      .where(eq(doctorClinicSchedules.doctorClinicId, doctorClinicId))
      .limit(1)

    if (!schedule) {
      return {
        id: null,
        doctorClinicId,
        weeklySchedule: [],
        specificBlocks: [],
        defaultAppointmentDuration: 30,
        minimumAdvanceHours: 0,
        maxFutureDays: 365,
        createdAt: null,
        updatedAt: null,
      }
    }

    return {
      id: schedule.id,
      doctorClinicId: schedule.doctorClinicId,
      weeklySchedule: (schedule.weeklySchedule as any) ?? [],
      specificBlocks: (schedule.specificBlocks as any) ?? [],
      defaultAppointmentDuration: schedule.defaultAppointmentDuration,
      minimumAdvanceHours: schedule.minimumAdvanceHours,
      maxFutureDays: schedule.maxFutureDays,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    }
  }

  async saveSchedule(
    clinicId: string,
    doctorId: string,
    dto: DoctorScheduleDto,
  ): Promise<GetDoctorScheduleResponseDto> {
    const doctorClinicId = await this.getDoctorClinicId(clinicId, doctorId)

    const existing = await db
      .select({ id: doctorClinicSchedules.id })
      .from(doctorClinicSchedules)
      .where(eq(doctorClinicSchedules.doctorClinicId, doctorClinicId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(doctorClinicSchedules)
        .set({
          weeklySchedule: dto.weeklySchedule,
          specificBlocks: dto.specificBlocks,
          defaultAppointmentDuration: dto.defaultAppointmentDuration,
          minimumAdvanceHours: dto.minimumAdvanceHours,
          maxFutureDays: dto.maxFutureDays,
          updatedAt: new Date(),
        })
        .where(eq(doctorClinicSchedules.doctorClinicId, doctorClinicId))
    } else {
      await db.insert(doctorClinicSchedules).values({
        doctorClinicId,
        weeklySchedule: dto.weeklySchedule,
        specificBlocks: dto.specificBlocks,
        defaultAppointmentDuration: dto.defaultAppointmentDuration,
        minimumAdvanceHours: dto.minimumAdvanceHours,
        maxFutureDays: dto.maxFutureDays,
      })
    }

    return this.getSchedule(clinicId, doctorId)
  }

  async findByUserId(clinicId: string, userId: string): Promise<DoctorProfileResponseDto> {
    const rows = await db
      .select({
        profileId: doctorProfiles.id,
        userId: doctorProfiles.userId,
        crm: doctorProfiles.crm,
        specialty: doctorProfiles.specialty,
        bio: doctorProfiles.bio,
        photoUrl: doctorProfiles.photoUrl,
        profileIsActive: doctorProfiles.isActive,
        userName: users.name,
        userEmail: users.email,
        linkId: doctorClinics.id,
        defaultDuration: doctorClinics.defaultDuration,
        notes: doctorClinics.notes,
        linkIsActive: doctorClinics.isActive,
      })
      .from(doctorClinics)
      .innerJoin(doctorProfiles, eq(doctorClinics.doctorId, doctorProfiles.userId))
      .innerJoin(users, eq(doctorProfiles.userId, users.id))
      .where(
        and(
          eq(doctorClinics.clinicId, clinicId),
          eq(doctorProfiles.userId, userId),
        ),
      )
      .limit(1)

    if (rows.length === 0) {
      throw new NotFoundException('Perfil médico não encontrado para este usuário nesta clínica')
    }

    const row = rows[0]
    return {
      id: row.profileId,
      userId: row.userId,
      name: row.userName,
      email: row.userEmail,
      crm: row.crm,
      specialty: row.specialty,
      bio: row.bio,
      photoUrl: row.photoUrl,
      isActive: row.profileIsActive,
      doctorClinic: {
        id: row.linkId,
        defaultDuration: row.defaultDuration,
        notes: row.notes,
        isActive: row.linkIsActive,
      },
    }
  }

  async findDoctorClinics(
    doctorId: string,
    allowedClinicIds: string[],
  ): Promise<ClinicForDoctorResponseDto[]> {
    // Busca o profile pelo ID fornecido
    const profile = await db
      .select({ userId: doctorProfiles.userId })
      .from(doctorProfiles)
      .where(eq(doctorProfiles.id, doctorId))
      .limit(1)

    if (profile.length === 0) {
      throw new NotFoundException('Médico não encontrado')
    }

    const userId = profile[0].userId

    const conditions = [eq(doctorClinics.doctorId, userId)]
    if (allowedClinicIds.length > 0) {
      conditions.push(inArray(doctorClinics.clinicId, allowedClinicIds))
    } else {
      // Sem clínicas acessíveis no JWT — retorna vazio
      return []
    }

    const rows = await db
      .select({
        clinicId: clinics.id,
        clinicName: clinics.name,
        clinicStatus: clinics.status,
        linkId: doctorClinics.id,
        defaultDuration: doctorClinics.defaultDuration,
        notes: doctorClinics.notes,
        linkIsActive: doctorClinics.isActive,
      })
      .from(doctorClinics)
      .innerJoin(clinics, eq(doctorClinics.clinicId, clinics.id))
      .where(and(...conditions))

    return rows.map((row) => ({
      id: row.clinicId,
      name: row.clinicName,
      status: row.clinicStatus,
      link: {
        id: row.linkId,
        defaultDuration: row.defaultDuration,
        notes: row.notes,
        isActive: row.linkIsActive,
      },
    }))
  }
}

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
  clinics,
} from '../../infrastructure/database/schema'
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto'
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto'
import { UpdateDoctorClinicDto } from './dto/update-doctor-clinic.dto'
import { DoctorProfileResponseDto } from './dto/doctor-profile-response.dto'
import { ClinicForDoctorResponseDto } from './dto/doctor-clinic-list-response.dto'

@Injectable()
export class DoctorService {
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
  ): Promise<DoctorProfileResponseDto> {
    // Verifica que o médico pertence à clínica
    const doctor = await this.findOne(clinicId, doctorId)

    await db
      .update(doctorClinics)
      .set({
        ...(dto.defaultDuration !== undefined && { defaultDuration: dto.defaultDuration }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
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

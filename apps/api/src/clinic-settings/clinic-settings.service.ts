import { Injectable } from '@nestjs/common'
import { db } from '../infrastructure/database'
import { eq } from 'drizzle-orm'
import {
  clinicObjectives,
  clinicServices,
  clinicScheduling,
  clinicCarolSettings,
  clinicNotifications,
} from '../infrastructure/database/schema'
import { ClinicObjectivesDto } from './dto/clinic-objectives.dto'
import { ClinicServicesDto } from './dto/clinic-services.dto'
import { ClinicSchedulingDto } from './dto/clinic-scheduling.dto'
import { ClinicCarolSettingsDto } from './dto/clinic-carol-settings.dto'
import { ClinicNotificationsDto } from './dto/clinic-notifications.dto'

@Injectable()
export class ClinicSettingsService {
  // OBJECTIVES
  async getObjectives(clinicId: string) {
    const result = await db
      .select()
      .from(clinicObjectives)
      .where(eq(clinicObjectives.clinicId, clinicId))
      .limit(1)

    return result[0] ?? null
  }

  async saveObjectives(clinicId: string, dto: ClinicObjectivesDto) {
    // Upsert: se existe, atualiza; senão, cria
    const existing = await db
      .select()
      .from(clinicObjectives)
      .where(eq(clinicObjectives.clinicId, clinicId))
      .limit(1)

    if (existing.length > 0) {
      // UPDATE
      const [updated] = await db
        .update(clinicObjectives)
        .set({
          priorities: dto.priorities,
          painPoints: dto.painPoints,
          additionalNotes: dto.additionalNotes,
          updatedAt: new Date(),
        })
        .where(eq(clinicObjectives.clinicId, clinicId))
        .returning()

      return updated
    } else {
      // INSERT
      const [created] = await db
        .insert(clinicObjectives)
        .values({
          clinicId,
          priorities: dto.priorities,
          painPoints: dto.painPoints,
          additionalNotes: dto.additionalNotes,
        })
        .returning()

      return created
    }
  }

  // SERVICES
  async getServices(clinicId: string) {
    const result = await db
      .select()
      .from(clinicServices)
      .where(eq(clinicServices.clinicId, clinicId))
      .limit(1)

    return result[0] ?? null
  }

  async saveServices(clinicId: string, dto: ClinicServicesDto) {
    const existing = await db
      .select()
      .from(clinicServices)
      .where(eq(clinicServices.clinicId, clinicId))
      .limit(1)

    if (existing.length > 0) {
      const [updated] = await db
        .update(clinicServices)
        .set({
          services: dto.services,
          updatedAt: new Date(),
        })
        .where(eq(clinicServices.clinicId, clinicId))
        .returning()

      return updated
    } else {
      const [created] = await db
        .insert(clinicServices)
        .values({
          clinicId,
          services: dto.services,
        })
        .returning()

      return created
    }
  }

  // SCHEDULING
  async getScheduling(clinicId: string) {
    const result = await db
      .select()
      .from(clinicScheduling)
      .where(eq(clinicScheduling.clinicId, clinicId))
      .limit(1)

    return result[0] ?? null
  }

  async saveScheduling(clinicId: string, dto: ClinicSchedulingDto) {
    const existing = await db
      .select()
      .from(clinicScheduling)
      .where(eq(clinicScheduling.clinicId, clinicId))
      .limit(1)

    if (existing.length > 0) {
      const [updated] = await db
        .update(clinicScheduling)
        .set({
          timeBlocks: dto.timeBlocks,
          minimumInterval: dto.minimumInterval,
          updatedAt: new Date(),
        })
        .where(eq(clinicScheduling.clinicId, clinicId))
        .returning()

      return updated
    } else {
      const [created] = await db
        .insert(clinicScheduling)
        .values({
          clinicId,
          timeBlocks: dto.timeBlocks,
          minimumInterval: dto.minimumInterval,
        })
        .returning()

      return created
    }
  }

  // CAROL SETTINGS
  async getCarolSettings(clinicId: string) {
    const result = await db
      .select()
      .from(clinicCarolSettings)
      .where(eq(clinicCarolSettings.clinicId, clinicId))
      .limit(1)

    return result[0] ?? null
  }

  async saveCarolSettings(clinicId: string, dto: ClinicCarolSettingsDto) {
    const existing = await db
      .select()
      .from(clinicCarolSettings)
      .where(eq(clinicCarolSettings.clinicId, clinicId))
      .limit(1)

    if (existing.length > 0) {
      const [updated] = await db
        .update(clinicCarolSettings)
        .set({
          selectedTraits: dto.selectedTraits,
          greeting: dto.greeting,
          restrictSensitiveTopics: dto.restrictSensitiveTopics,
          updatedAt: new Date(),
        })
        .where(eq(clinicCarolSettings.clinicId, clinicId))
        .returning()

      return updated
    } else {
      const [created] = await db
        .insert(clinicCarolSettings)
        .values({
          clinicId,
          selectedTraits: dto.selectedTraits,
          greeting: dto.greeting,
          restrictSensitiveTopics: dto.restrictSensitiveTopics,
        })
        .returning()

      return created
    }
  }

  // NOTIFICATIONS
  async getNotifications(clinicId: string) {
    const result = await db
      .select()
      .from(clinicNotifications)
      .where(eq(clinicNotifications.clinicId, clinicId))
      .limit(1)

    return result[0] ?? null
  }

  async saveNotifications(clinicId: string, dto: ClinicNotificationsDto) {
    const existing = await db
      .select()
      .from(clinicNotifications)
      .where(eq(clinicNotifications.clinicId, clinicId))
      .limit(1)

    if (existing.length > 0) {
      const [updated] = await db
        .update(clinicNotifications)
        .set({
          notificationSettings: dto.notificationSettings,
          alertChannel: dto.alertChannel,
          phoneNumber: dto.phoneNumber,
          updatedAt: new Date(),
        })
        .where(eq(clinicNotifications.clinicId, clinicId))
        .returning()

      return updated
    } else {
      const [created] = await db
        .insert(clinicNotifications)
        .values({
          clinicId,
          notificationSettings: dto.notificationSettings,
          alertChannel: dto.alertChannel,
          phoneNumber: dto.phoneNumber,
        })
        .returning()

      return created
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { db } from '../../infrastructure/database'
import { clinicCarolSettings } from '../../infrastructure/database/schema'
import { SaveCarolConfigDto } from './dto/save-carol-config.dto'
import { CarolConfigResponseDto } from './dto/carol-config-response.dto'

@Injectable()
export class CarolConfigService {
  async getDraftConfig(clinicId: string): Promise<CarolConfigResponseDto | null> {
    const result = await db
      .select()
      .from(clinicCarolSettings)
      .where(
        and(
          eq(clinicCarolSettings.clinicId, clinicId),
          eq(clinicCarolSettings.status, 'draft'),
        ),
      )
      .limit(1)

    return (result[0] as CarolConfigResponseDto) ?? null
  }

  async saveDraftConfig(clinicId: string, dto: SaveCarolConfigDto): Promise<CarolConfigResponseDto> {
    const existing = await this.getDraftConfig(clinicId)

    if (existing) {
      const [updated] = await db
        .update(clinicCarolSettings)
        .set({
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.selectedTraits !== undefined && { selectedTraits: dto.selectedTraits }),
          ...(dto.voiceTone !== undefined && { voiceTone: dto.voiceTone }),
          ...(dto.greeting !== undefined && { greeting: dto.greeting }),
          ...(dto.restrictSensitiveTopics !== undefined && { restrictSensitiveTopics: dto.restrictSensitiveTopics }),
          ...(dto.schedulingRules !== undefined && { schedulingRules: dto.schedulingRules }),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(clinicCarolSettings.clinicId, clinicId),
            eq(clinicCarolSettings.status, 'draft'),
          ),
        )
        .returning()

      return updated as CarolConfigResponseDto
    } else {
      const [created] = await db
        .insert(clinicCarolSettings)
        .values({
          clinicId,
          name: dto.name ?? 'Carol',
          selectedTraits: dto.selectedTraits ?? [],
          voiceTone: dto.voiceTone ?? 'empathetic',
          greeting: dto.greeting ?? '',
          restrictSensitiveTopics: dto.restrictSensitiveTopics ?? true,
          schedulingRules: dto.schedulingRules ?? {},
          status: 'draft',
        })
        .returning()

      return created as CarolConfigResponseDto
    }
  }

  async publishDraft(clinicId: string): Promise<CarolConfigResponseDto> {
    const draft = await this.getDraftConfig(clinicId)
    if (!draft) throw new NotFoundException('Draft config not found')

    const publishedData = {
      clinicId,
      name: draft.name,
      selectedTraits: draft.selectedTraits,
      voiceTone: draft.voiceTone,
      greeting: draft.greeting,
      restrictSensitiveTopics: draft.restrictSensitiveTopics,
      schedulingRules: draft.schedulingRules,
      status: 'published' as const,
      publishedAt: new Date(),
      updatedAt: new Date(),
    }

    const existing = await this.getPublishedConfig(clinicId)

    if (existing) {
      const [updated] = await db
        .update(clinicCarolSettings)
        .set(publishedData)
        .where(
          and(
            eq(clinicCarolSettings.clinicId, clinicId),
            eq(clinicCarolSettings.status, 'published'),
          ),
        )
        .returning()

      return updated as CarolConfigResponseDto
    } else {
      const [created] = await db
        .insert(clinicCarolSettings)
        .values(publishedData)
        .returning()

      return created as CarolConfigResponseDto
    }
  }

  async getPublishedConfig(clinicId: string): Promise<CarolConfigResponseDto | null> {
    const result = await db
      .select()
      .from(clinicCarolSettings)
      .where(
        and(
          eq(clinicCarolSettings.clinicId, clinicId),
          eq(clinicCarolSettings.status, 'published'),
        ),
      )
      .limit(1)

    return (result[0] as CarolConfigResponseDto) ?? null
  }

  async getConfigByVersion(
    clinicId: string,
    version: 'draft' | 'published',
  ): Promise<CarolConfigResponseDto | null> {
    return version === 'draft'
      ? this.getDraftConfig(clinicId)
      : this.getPublishedConfig(clinicId)
  }
}

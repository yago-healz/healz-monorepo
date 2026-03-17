import { Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '../../infrastructure/database'
import { clinicEscalationTriggers } from '../../infrastructure/database/schema'
import { CreateEscalationTriggerDto } from './dto/create-escalation-trigger.dto'
import { EscalationTriggerResponseDto } from './dto/escalation-trigger-response.dto'
import { UpdateEscalationTriggerDto } from './dto/update-escalation-trigger.dto'

@Injectable()
export class EscalationTriggerService {
  async list(clinicId: string): Promise<EscalationTriggerResponseDto[]> {
    return db
      .select()
      .from(clinicEscalationTriggers)
      .where(eq(clinicEscalationTriggers.clinicId, clinicId))
      .orderBy(asc(clinicEscalationTriggers.createdAt)) as Promise<EscalationTriggerResponseDto[]>
  }

  async create(clinicId: string, dto: CreateEscalationTriggerDto): Promise<EscalationTriggerResponseDto> {
    const [created] = await db
      .insert(clinicEscalationTriggers)
      .values({
        clinicId,
        name: dto.name,
        description: dto.description,
        conditionType: dto.conditionType,
        conditionParams: dto.conditionParams ?? null,
        isActive: dto.isActive ?? true,
      })
      .returning()

    return created as EscalationTriggerResponseDto
  }

  async update(clinicId: string, triggerId: string, dto: UpdateEscalationTriggerDto): Promise<EscalationTriggerResponseDto> {
    const [updated] = await db
      .update(clinicEscalationTriggers)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.conditionType !== undefined && { conditionType: dto.conditionType }),
        ...(dto.conditionParams !== undefined && { conditionParams: dto.conditionParams }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clinicEscalationTriggers.id, triggerId),
          eq(clinicEscalationTriggers.clinicId, clinicId),
        ),
      )
      .returning()

    if (!updated) throw new NotFoundException('Escalation trigger not found')

    return updated as EscalationTriggerResponseDto
  }

  async remove(clinicId: string, triggerId: string): Promise<void> {
    const [deleted] = await db
      .delete(clinicEscalationTriggers)
      .where(
        and(
          eq(clinicEscalationTriggers.id, triggerId),
          eq(clinicEscalationTriggers.clinicId, clinicId),
        ),
      )
      .returning()

    if (!deleted) throw new NotFoundException('Escalation trigger not found')
  }
}

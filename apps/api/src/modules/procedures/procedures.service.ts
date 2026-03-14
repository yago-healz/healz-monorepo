import { Injectable, NotFoundException } from '@nestjs/common'
import { and, count, eq, ilike } from 'drizzle-orm'
import { db } from '../../infrastructure/database'
import { procedures } from '../../infrastructure/database/schema'
import { buildPaginatedResponse, calculatePagination } from '../platform-admin/utils/pagination.helper'
import { CreateProcedureDto } from './dto/create-procedure.dto'
import { ListProceduresQueryDto } from './dto/list-procedures-query.dto'
import { UpdateProcedureDto } from './dto/update-procedure.dto'

@Injectable()
export class ProceduresService {
  async create(clinicId: string, dto: CreateProcedureDto) {
    const [procedure] = await db
      .insert(procedures)
      .values({
        clinicId,
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category ?? null,
        defaultDuration: dto.defaultDuration,
      })
      .returning()

    return procedure
  }

  async findAll(clinicId: string, query: ListProceduresQueryDto) {
    const { page = 1, limit = 20, search, category, status = 'active' } = query

    const conditions = [eq(procedures.clinicId, clinicId)]

    if (search) {
      conditions.push(ilike(procedures.name, `%${search}%`))
    }

    if (category) {
      conditions.push(eq(procedures.category, category))
    }

    if (status === 'active') {
      conditions.push(eq(procedures.isActive, true))
    } else if (status === 'inactive') {
      conditions.push(eq(procedures.isActive, false))
    }

    const where = and(...conditions)
    const { offset } = calculatePagination(page, limit)

    const [{ total }] = await db
      .select({ total: count() })
      .from(procedures)
      .where(where)

    const rows = await db
      .select()
      .from(procedures)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(procedures.createdAt)

    return buildPaginatedResponse(rows, Number(total), page, limit)
  }

  async findOne(clinicId: string, id: string) {
    const [procedure] = await db
      .select()
      .from(procedures)
      .where(and(eq(procedures.id, id), eq(procedures.clinicId, clinicId)))
      .limit(1)

    if (!procedure) {
      throw new NotFoundException('Procedimento não encontrado')
    }

    return procedure
  }

  async update(clinicId: string, id: string, dto: UpdateProcedureDto) {
    await this.findOne(clinicId, id)

    const [updated] = await db
      .update(procedures)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.defaultDuration !== undefined && { defaultDuration: dto.defaultDuration }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(and(eq(procedures.id, id), eq(procedures.clinicId, clinicId)))
      .returning()

    return updated
  }

  async deactivate(clinicId: string, id: string) {
    await this.findOne(clinicId, id)

    await db
      .update(procedures)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(procedures.id, id), eq(procedures.clinicId, clinicId)))

    return { success: true }
  }
}

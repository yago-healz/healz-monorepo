import { Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '../../infrastructure/database'
import { clinicCarolFaqs } from '../../infrastructure/database/schema'
import { CreateFaqDto } from './dto/create-faq.dto'
import { FaqResponseDto } from './dto/faq-response.dto'
import { UpdateFaqDto } from './dto/update-faq.dto'

@Injectable()
export class FaqService {
  async list(clinicId: string): Promise<FaqResponseDto[]> {
    return db
      .select()
      .from(clinicCarolFaqs)
      .where(eq(clinicCarolFaqs.clinicId, clinicId))
      .orderBy(asc(clinicCarolFaqs.createdAt)) as Promise<FaqResponseDto[]>
  }

  async create(clinicId: string, dto: CreateFaqDto): Promise<FaqResponseDto> {
    const [created] = await db
      .insert(clinicCarolFaqs)
      .values({ clinicId, question: dto.question, answer: dto.answer })
      .returning()

    return created as FaqResponseDto
  }

  async update(clinicId: string, faqId: string, dto: UpdateFaqDto): Promise<FaqResponseDto> {
    const [updated] = await db
      .update(clinicCarolFaqs)
      .set({
        ...(dto.question !== undefined && { question: dto.question }),
        ...(dto.answer !== undefined && { answer: dto.answer }),
        updatedAt: new Date(),
      })
      .where(and(eq(clinicCarolFaqs.id, faqId), eq(clinicCarolFaqs.clinicId, clinicId)))
      .returning()

    if (!updated) throw new NotFoundException('FAQ not found')

    return updated as FaqResponseDto
  }

  async remove(clinicId: string, faqId: string): Promise<void> {
    const [deleted] = await db
      .delete(clinicCarolFaqs)
      .where(and(eq(clinicCarolFaqs.id, faqId), eq(clinicCarolFaqs.clinicId, clinicId)))
      .returning()

    if (!deleted) throw new NotFoundException('FAQ not found')
  }
}

import { Injectable, NotFoundException } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { db } from '../../infrastructure/database'
import { paymentMethods } from '../../infrastructure/database/schema'
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto'
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto'

@Injectable()
export class PaymentMethodsService {
  async create(clinicId: string, dto: CreatePaymentMethodDto) {
    const [created] = await db
      .insert(paymentMethods)
      .values({
        clinicId,
        type: dto.type as any,
        name: dto.name,
        instructions: dto.instructions ?? null,
      })
      .returning()

    return created
  }

  async findAll(clinicId: string) {
    return db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.clinicId, clinicId))
  }

  async update(clinicId: string, id: string, dto: UpdatePaymentMethodDto) {
    await this.findOneOrFail(clinicId, id)

    const [updated] = await db
      .update(paymentMethods)
      .set({
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.instructions !== undefined && { instructions: dto.instructions }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.clinicId, clinicId)))
      .returning()

    return updated
  }

  async deactivate(clinicId: string, id: string): Promise<{ success: boolean }> {
    await this.findOneOrFail(clinicId, id)

    await db
      .update(paymentMethods)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.clinicId, clinicId)))

    return { success: true }
  }

  private async findOneOrFail(clinicId: string, id: string) {
    const rows = await db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.clinicId, clinicId)))
      .limit(1)

    if (rows.length === 0) {
      throw new NotFoundException('Forma de pagamento não encontrada')
    }

    return rows[0]
  }
}

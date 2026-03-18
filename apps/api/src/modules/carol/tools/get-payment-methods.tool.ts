import { StructuredTool } from '@langchain/core/tools'
import { Logger } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../infrastructure/database'
import { paymentMethods } from '../../../infrastructure/database/schema'

export class GetPaymentMethodsTool extends StructuredTool {
  name = 'get_payment_methods'
  description = 'Lista as formas de pagamento aceitas pela clínica (PIX, cartão de crédito, débito, dinheiro, convênio, etc.)'
  schema = z.object({})

  private readonly logger = new Logger(GetPaymentMethodsTool.name)

  constructor(private readonly clinicId: string) {
    super()
  }

  async _call(): Promise<string> {
    this.logger.debug(`Fetching payment methods for clinic ${this.clinicId}`)

    const rows = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.clinicId, this.clinicId),
          eq(paymentMethods.isActive, true),
        ),
      )

    const methods = rows.map((row) => ({
      type: row.type,
      name: row.name,
      ...(row.instructions && { instructions: row.instructions }),
    }))

    this.logger.debug(`Found ${methods.length} payment methods for clinic ${this.clinicId}`)
    return JSON.stringify({ paymentMethods: methods })
  }
}

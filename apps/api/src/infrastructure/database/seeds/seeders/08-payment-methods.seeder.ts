import { db } from '../../index'
import { paymentMethods } from '../../schema'
import type { SeedContext } from '../seed'

const PAYMENT_METHODS_BY_CLINIC: Record<string, Array<{
  type: 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'insurance' | 'bank_transfer'
  name: string
  instructions: string | null
  isActive: boolean
}>> = {
  bellavita_sp: [
    { type: 'pix', name: 'PIX', instructions: 'Chave PIX: 11.222.333/0001-44 (CNPJ)', isActive: true },
    { type: 'credit_card', name: 'Cartão de Crédito', instructions: 'Visa, Mastercard e Amex. Parcelamos em até 12x', isActive: true },
    { type: 'debit_card', name: 'Cartão de Débito', instructions: 'Principais bandeiras aceitas', isActive: true },
    { type: 'cash', name: 'Dinheiro', instructions: null, isActive: true },
    { type: 'bank_transfer', name: 'Transferência Bancária', instructions: 'Banco do Brasil - Ag: 1234-5 / CC: 67890-1', isActive: false },
  ],
  bellavita_rj: [
    { type: 'pix', name: 'PIX', instructions: 'Chave PIX: bellavita.rj@email.com', isActive: true },
    { type: 'credit_card', name: 'Cartão de Crédito', instructions: 'Parcelamos em até 10x sem juros', isActive: true },
    { type: 'debit_card', name: 'Cartão de Débito', instructions: null, isActive: true },
    { type: 'cash', name: 'Dinheiro', instructions: null, isActive: true },
    { type: 'insurance', name: 'Convênio Bradesco Saúde', instructions: 'Somente procedimentos cobertos pelo plano', isActive: false },
  ],
  smileplus: [
    { type: 'pix', name: 'PIX', instructions: 'Chave PIX: 55.666.777/0001-88 (CNPJ)', isActive: true },
    { type: 'credit_card', name: 'Cartão de Crédito', instructions: 'Parcelamos em até 24x para tratamentos', isActive: true },
    { type: 'debit_card', name: 'Cartão de Débito', instructions: null, isActive: true },
    { type: 'insurance', name: 'Unimed', instructions: 'Consultas e procedimentos cobertos', isActive: true },
    { type: 'cash', name: 'Dinheiro', instructions: null, isActive: false },
  ],
}

export async function seedPaymentMethods(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding payment_methods...')

  let total = 0

  for (const [clinicKey, methods] of Object.entries(PAYMENT_METHODS_BY_CLINIC)) {
    const clinicId = ctx.clinicIds[clinicKey]
    if (!clinicId) continue

    for (const method of methods) {
      await db.insert(paymentMethods).values({
        clinicId,
        type: method.type,
        name: method.name,
        instructions: method.instructions ?? undefined,
        isActive: method.isActive,
      })
      total++
    }
  }

  if (verbose) console.log(`  ✓ ${total} payment_methods created`)
}

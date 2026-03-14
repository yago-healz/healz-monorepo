import { db } from '../../index'
import { addresses } from '../../schema'
import type { SeedContext } from '../seed'
import { ADDRESSES_DATA } from '../data/organizations.data'

export async function seedAddresses(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding addresses...')

  for (const addr of ADDRESSES_DATA) {
    const [result] = await db.insert(addresses).values({
      street: addr.street,
      number: addr.number,
      complement: addr.complement ?? undefined,
      neighborhood: addr.neighborhood ?? undefined,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      country: addr.country,
    }).returning()

    ctx.addressIds[addr.key] = result.id
  }

  if (verbose) console.log(`  ✓ ${ADDRESSES_DATA.length} addresses created`)
}

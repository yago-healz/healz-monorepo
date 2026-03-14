import { db } from '../../index'
import { organizations } from '../../schema'
import type { SeedContext } from '../seed'
import { ORGANIZATIONS_DATA } from '../data/organizations.data'

export async function seedOrganizations(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding organizations...')

  for (const org of ORGANIZATIONS_DATA) {
    const [result] = await db.insert(organizations).values({
      name: org.name,
      slug: org.slug,
      status: org.status,
    }).returning()

    ctx.organizationIds[org.key] = result.id
  }

  if (verbose) console.log(`  ✓ ${ORGANIZATIONS_DATA.length} organizations created`)
}

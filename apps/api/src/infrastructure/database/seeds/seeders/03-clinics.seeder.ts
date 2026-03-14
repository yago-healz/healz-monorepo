import { db } from '../../index'
import { clinics } from '../../schema'
import type { SeedContext } from '../seed'
import { CLINICS_DATA } from '../data/organizations.data'

export async function seedClinics(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding clinics...')

  for (const clinic of CLINICS_DATA) {
    const [result] = await db.insert(clinics).values({
      organizationId: ctx.organizationIds[clinic.orgKey],
      name: clinic.name,
      description: clinic.description,
      addressId: ctx.addressIds[clinic.addressKey],
      status: clinic.status,
    }).returning()

    ctx.clinicIds[clinic.key] = result.id
  }

  if (verbose) console.log(`  ✓ ${CLINICS_DATA.length} clinics created`)
}

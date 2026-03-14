import { db } from '../../index'
import { patientView } from '../../schema'
import type { SeedContext } from '../seed'
import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import { SEED_CONFIG } from '../config'

export async function seedPatients(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding patients...')

  // Clinic distribution: ~40 bellavita_sp, ~30 bellavita_rj, ~30 smileplus
  const distribution: Array<{ clinicKey: string; orgKey: string; count: number }> = [
    { clinicKey: 'bellavita_sp', orgKey: 'bellavita', count: 40 },
    { clinicKey: 'bellavita_rj', orgKey: 'bellavita', count: 30 },
    { clinicKey: 'smileplus', orgKey: 'smileplus', count: 30 },
  ]

  const sources = ['whatsapp', 'indicação', 'instagram', 'google', 'facebook']
  const now = new Date()
  const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate())

  for (const { clinicKey, orgKey, count } of distribution) {
    const clinicId = ctx.clinicIds[clinicKey]
    const tenantId = ctx.organizationIds[orgKey]
    if (!clinicId || !tenantId) continue

    for (let i = 0; i < count; i++) {
      const patientId = randomUUID()
      const isAnonymous = i >= count - 5 // last 5 are anonymous (no name)
      const statusRoll = Math.random()
      const status = statusRoll < 0.85 ? 'active' : statusRoll < 0.95 ? 'inactive' : 'active'

      // Random DDD for Brazilian phones
      const ddd = faker.helpers.arrayElement(['11', '21', '31', '41', '51', '61', '71', '81', '85', '62'])
      const phoneNumber = faker.string.numeric(9)
      const phone = `+55${ddd}${phoneNumber}`

      const birthYear = faker.number.int({ min: now.getFullYear() - 85, max: now.getFullYear() - 18 })
      const birthDate = faker.date.between({
        from: new Date(birthYear, 0, 1),
        to: new Date(birthYear, 11, 31),
      }).toISOString().split('T')[0]

      const createdAt = faker.date.between({ from: threeYearsAgo, to: now })

      await db.insert(patientView).values({
        id: patientId,
        tenantId,
        clinicId,
        phone,
        fullName: isAnonymous ? null : faker.person.fullName(),
        email: isAnonymous || Math.random() > 0.7 ? null : faker.internet.email(),
        birthDate,
        status,
        metadata: { source: faker.helpers.arrayElement(sources) } as any,
        createdAt,
        updatedAt: createdAt,
      })

      ctx.patientIds.push(patientId)
      ctx.patientClinics[patientId] = { clinicId, tenantId }
    }
  }

  if (verbose) console.log(`  ✓ ${SEED_CONFIG.PATIENT_COUNT} patients created`)
}

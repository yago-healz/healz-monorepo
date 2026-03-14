import { db } from '../../index'
import { users, userClinicRoles, platformAdmins, doctorProfiles } from '../../schema'
import type { SeedContext } from '../seed'
import { USERS_DATA } from '../data/users.data'
import { hashPassword } from '../helpers'
import { SEED_CONFIG } from '../config'

export async function seedUsers(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding users...')

  const testHash = await hashPassword(SEED_CONFIG.TEST_PASSWORD)
  const adminHash = await hashPassword(SEED_CONFIG.ADMIN_PASSWORD)

  for (const userData of USERS_DATA) {
    const isAdmin = userData.email === 'admin@healz.com'
    const passwordHash = isAdmin ? adminHash : testHash

    const deactivatedAt = userData.status === 'inactive' ? new Date('2025-12-01') : undefined

    const userResult = await db.insert(users).values({
      email: userData.email,
      passwordHash,
      name: userData.name,
      emailVerified: userData.emailVerified,
      status: userData.status,
      deactivatedAt: deactivatedAt ?? undefined,
      deactivationReason: userData.deactivationReason ?? undefined,
    }).returning()
    const user = (userResult as any[])[0]

    ctx.userIds[userData.key] = user.id
    ctx.userIds[userData.email] = user.id

    // Platform admin
    if (userData.isPlatformAdmin) {
      await db.insert(platformAdmins).values({
        userId: user.id,
        createdBy: null,
      })
    }

    // Clinic roles
    for (const roleData of userData.clinicRoles) {
      const clinicId = ctx.clinicIds[roleData.clinicKey]
      if (!clinicId) continue

      await db.insert(userClinicRoles).values({
        userId: user.id,
        clinicId,
        role: roleData.role as any,
      })
    }

    // Doctor profile
    if (userData.doctorProfile) {
      await db.insert(doctorProfiles).values({
        userId: user.id,
        crm: userData.doctorProfile.crm,
        specialty: userData.doctorProfile.specialty,
        bio: userData.doctorProfile.bio,
        isActive: true,
      })
    }
  }

  if (verbose) console.log(`  ✓ ${USERS_DATA.length} users created`)
}

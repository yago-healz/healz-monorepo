import { db } from '../../index'
import { auditLogs } from '../../schema'
import type { SeedContext } from '../seed'
import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import { SEED_CONFIG } from '../config'

const ACTIONS = ['LOGIN', 'LOGIN_FAILED', 'CREATE', 'UPDATE', 'DELETE', 'READ']
const RESOURCES = [
  '/api/v1/clinics',
  '/api/v1/appointments',
  '/api/v1/patients',
  '/api/v1/users',
  '/api/v1/procedures',
  '/api/v1/conversations',
  '/api/v1/auth/login',
  '/api/v1/doctor-profiles',
  '/api/v1/clinic-settings',
]
const METHODS: Record<string, string> = {
  LOGIN: 'POST',
  LOGIN_FAILED: 'POST',
  CREATE: 'POST',
  UPDATE: 'PATCH',
  DELETE: 'DELETE',
  READ: 'GET',
}
const STATUS_CODES: Record<string, number[]> = {
  LOGIN: [200],
  LOGIN_FAILED: [401],
  CREATE: [201, 400, 422],
  UPDATE: [200, 400, 404],
  DELETE: [200, 204, 404],
  READ: [200, 404],
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  'PostmanRuntime/7.36.0',
]

export async function seedAuditLogs(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding audit_logs...')

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - SEED_CONFIG.AUDIT_LOGS_PAST_DAYS * 24 * 60 * 60 * 1000)

  const userKeys = Object.keys(ctx.userIds).filter((k) => !k.includes('@'))
  const clinicKeys = Object.keys(ctx.clinicIds)
  const orgKeys = Object.keys(ctx.organizationIds)

  for (let i = 0; i < SEED_CONFIG.AUDIT_LOG_COUNT; i++) {
    const action = faker.helpers.arrayElement(ACTIONS)
    const resource = faker.helpers.arrayElement(RESOURCES)
    const method = METHODS[action]
    const possibleStatusCodes = STATUS_CODES[action]
    const statusCode = faker.helpers.arrayElement(possibleStatusCodes)

    const userKey = faker.helpers.arrayElement(userKeys)
    const userId = ctx.userIds[userKey]

    const clinicKey = faker.helpers.arrayElement(clinicKeys)
    const clinicId = ctx.clinicIds[clinicKey]

    const orgKey = faker.helpers.arrayElement(orgKeys)
    const organizationId = ctx.organizationIds[orgKey]

    await db.insert(auditLogs).values({
      id: randomUUID(),
      userId: Math.random() > 0.1 ? userId : null,
      organizationId,
      clinicId,
      action,
      resource,
      method,
      statusCode,
      ip: faker.internet.ip(),
      userAgent: faker.helpers.arrayElement(USER_AGENTS),
      metadata: action === 'LOGIN_FAILED'
        ? { reason: 'invalid_credentials', attemptCount: faker.number.int({ min: 1, max: 5 }) }
        : null,
      createdAt: faker.date.between({ from: sevenDaysAgo, to: now }),
    })
  }

  if (verbose) console.log(`  ✓ ${SEED_CONFIG.AUDIT_LOG_COUNT} audit logs created`)
}

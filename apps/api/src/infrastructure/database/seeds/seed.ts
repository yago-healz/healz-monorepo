import { faker } from '@faker-js/faker'
import { sql } from 'drizzle-orm'
import { db } from '../index'
import { SEED_CONFIG } from './config'
import { seedOrganizations } from './seeders/01-organizations.seeder'
import { seedAddresses } from './seeders/02-addresses.seeder'
import { seedClinics } from './seeders/03-clinics.seeder'
import { seedUsers } from './seeders/04-users.seeder'
import { seedInvites } from './seeders/05-invites.seeder'
import { seedDoctorClinics } from './seeders/06-doctor-clinics.seeder'
import { seedProcedures } from './seeders/07-procedures.seeder'
import { seedPaymentMethods } from './seeders/08-payment-methods.seeder'
import { seedClinicSettings } from './seeders/09-clinic-settings.seeder'
import { seedPatients } from './seeders/10-patients.seeder'
import { seedConversations } from './seeders/11-conversations.seeder'
import { seedAppointments } from './seeders/12-appointments.seeder'
import { seedPatientJourneys } from './seeders/13-patient-journeys.seeder'
import { seedAuditLogs } from './seeders/14-audit-logs.seeder'

export interface SeedContext {
  organizationIds: Record<string, string>
  clinicIds: Record<string, string>
  addressIds: Record<string, string>
  userIds: Record<string, string>
  doctorClinicIds: Record<string, string>
  procedureIdsByClinic: Record<string, string[]>
  patientIds: string[]
  patientClinics: Record<string, { clinicId: string; tenantId: string }>
  conversationIds: string[]
}

function createEmptyContext(): SeedContext {
  return {
    organizationIds: {},
    clinicIds: {},
    addressIds: {},
    userIds: {},
    doctorClinicIds: {},
    procedureIdsByClinic: {},
    patientIds: [],
    patientClinics: {},
    conversationIds: [],
  }
}

async function resetDatabase(): Promise<void> {
  console.log('🗑️  Resetting database...')
  await db.execute(sql`
    TRUNCATE TABLE
      audit_logs,
      patient_journey_view,
      appointment_view,
      message_view,
      conversation_view,
      patient_view,
      clinic_notifications,
      clinic_carol_settings,
      clinic_scheduling,
      clinic_objectives,
      payment_methods,
      doctor_clinic_procedures,
      procedures,
      doctor_clinic_schedules,
      doctor_clinics,
      doctor_profiles,
      invites,
      platform_admins,
      user_clinic_roles,
      refresh_tokens,
      events,
      users,
      clinics,
      addresses,
      organizations
    CASCADE
  `)
  console.log('✅ Database reset complete\n')
}

async function runSeeds(verbose: boolean): Promise<void> {
  // Set faker seed for reproducibility
  faker.seed(SEED_CONFIG.FAKER_SEED)

  const ctx = createEmptyContext()

  const steps = [
    { name: 'Organizations', fn: () => seedOrganizations(ctx, verbose) },
    { name: 'Addresses',     fn: () => seedAddresses(ctx, verbose) },
    { name: 'Clinics',       fn: () => seedClinics(ctx, verbose) },
    { name: 'Users',         fn: () => seedUsers(ctx, verbose) },
    { name: 'Invites',       fn: () => seedInvites(ctx, verbose) },
    { name: 'Doctor Clinics + Schedules', fn: () => seedDoctorClinics(ctx, verbose) },
    { name: 'Procedures + Doctor Procedures', fn: () => seedProcedures(ctx, verbose) },
    { name: 'Payment Methods', fn: () => seedPaymentMethods(ctx, verbose) },
    { name: 'Clinic Settings', fn: () => seedClinicSettings(ctx, verbose) },
    { name: 'Patients',      fn: () => seedPatients(ctx, verbose) },
    { name: 'Conversations + Messages', fn: () => seedConversations(ctx, verbose) },
    { name: 'Appointments',  fn: () => seedAppointments(ctx, verbose) },
    { name: 'Patient Journeys', fn: () => seedPatientJourneys(ctx, verbose) },
    { name: 'Audit Logs',    fn: () => seedAuditLogs(ctx, verbose) },
  ]

  for (const step of steps) {
    if (!verbose) process.stdout.write(`  ${step.name}... `)
    await step.fn()
    if (!verbose) console.log('✓')
  }
}

function printSummary(): void {
  console.log('\n' + '='.repeat(60))
  console.log('🌱 Seed Complete! Test credentials:')
  console.log('='.repeat(60))
  console.log('')
  console.log('  Platform Admin:')
  console.log('    admin@healz.com           Admin123!')
  console.log('')
  console.log('  Bella Vita:')
  console.log('    joao@bellavita.com         Test123!  (admin)')
  console.log('    maria@bellavita.com        Test123!  (manager, SP)')
  console.log('    dr.carlos@bellavita.com    Test123!  (doctor, SP+RJ)')
  console.log('    dr.rafael@bellavita.com    Test123!  (doctor, SP+RJ)')
  console.log('    dr.marcos@bellavita.com    Test123!  (doctor, RJ+SP)')
  console.log('    ana@bellavita.com          Test123!  (receptionist, SP)')
  console.log('    viewer@bellavita.com       Test123!  (viewer, SP)')
  console.log('    inativo@bellavita.com      Test123!  (inactive)')
  console.log('')
  console.log('  SmilePlus:')
  console.log('    pedro@smileplus.com        Test123!  (admin)')
  console.log('    dr.lucia@smileplus.com     Test123!  (doctor)')
  console.log('    dr.ana@smileplus.com       Test123!  (doctor)')
  console.log('    manager@smileplus.com      Test123!  (manager)')
  console.log('')
  console.log('  Data volume:')
  console.log('    • 3 organizations, 4 clinics, 15 users')
  console.log('    • 5 doctor profiles, 8 doctor-clinic links')
  console.log('    • ~30 procedures, ~15 payment methods')
  console.log('    • 100 patients, 80 conversations, ~400 messages')
  console.log('    • 135 appointments, 100 patient journeys')
  console.log('    • 50 audit logs, 5 invites')
  console.log('='.repeat(60))
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const doReset = args.includes('--reset')
  const verbose = args.includes('--verbose')

  console.log('🌱 Starting database seed...\n')

  try {
    if (doReset) {
      await resetDatabase()
    }

    await runSeeds(verbose)
    printSummary()
  } catch (err) {
    console.error('\n❌ Seed failed:', err)
    process.exit(1)
  }

  process.exit(0)
}

main()

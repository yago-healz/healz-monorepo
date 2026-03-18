import { db } from '../index'
import { sql } from 'drizzle-orm'

async function reset() {
  console.log('🗑️  Resetting database...')

  await db.execute(sql`
    TRUNCATE TABLE
      audit_logs,
      patient_journey_view,
      appointment_view,
      message_view,
      conversation_view,
      patient_view,
      clinic_appointment_gcal_events,
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

  console.log('✅ Database reset complete')
}

reset()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Reset failed:', err)
    process.exit(1)
  })

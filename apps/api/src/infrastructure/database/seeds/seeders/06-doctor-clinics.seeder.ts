import { db } from '../../index'
import { doctorClinics, doctorClinicSchedules } from '../../schema'
import type { SeedContext } from '../seed'
import { randomUUID } from 'crypto'

interface DaySchedule {
  day: string
  isOpen: boolean
  timeSlots: Array<{ id: string; from: string; to: string }>
}

function buildWeeklySchedule(variant: 'standard' | 'morning' | 'extended'): DaySchedule[] {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  return days.map((day) => {
    if (day === 'sunday') return { day, isOpen: false, timeSlots: [] }

    if (day === 'saturday') {
      if (variant === 'extended') {
        return {
          day,
          isOpen: true,
          timeSlots: [{ id: randomUUID(), from: '08:00', to: '12:00' }],
        }
      }
      return { day, isOpen: false, timeSlots: [] }
    }

    if (variant === 'morning') {
      return {
        day,
        isOpen: true,
        timeSlots: [{ id: randomUUID(), from: '08:00', to: '13:00' }],
      }
    }

    // standard & extended weekdays
    return {
      day,
      isOpen: true,
      timeSlots: [
        { id: randomUUID(), from: '08:00', to: '12:00' },
        { id: randomUUID(), from: '14:00', to: '18:00' },
      ],
    }
  })
}

function buildSpecificBlocks(): Array<{ id: string; date: string; from: string; to: string; reason: string }> {
  const now = new Date()
  const futureDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
  const dateStr = futureDate.toISOString().split('T')[0]

  return [
    {
      id: randomUUID(),
      date: dateStr,
      from: '08:00',
      to: '18:00',
      reason: 'Congresso médico',
    },
  ]
}

// Doctor-clinic links: 8 total
const DOCTOR_CLINIC_LINKS = [
  { key: 'carlos_sp', doctorKey: 'dr_carlos', clinicKey: 'bellavita_sp', defaultDuration: 30, scheduleVariant: 'standard' as const },
  { key: 'carlos_rj', doctorKey: 'dr_carlos', clinicKey: 'bellavita_rj', defaultDuration: 30, scheduleVariant: 'morning' as const },
  { key: 'rafael_sp', doctorKey: 'dr_rafael', clinicKey: 'bellavita_sp', defaultDuration: 45, scheduleVariant: 'extended' as const },
  { key: 'rafael_rj', doctorKey: 'dr_rafael', clinicKey: 'bellavita_rj', defaultDuration: 45, scheduleVariant: 'standard' as const },
  { key: 'marcos_rj', doctorKey: 'dr_marcos', clinicKey: 'bellavita_rj', defaultDuration: 30, scheduleVariant: 'morning' as const },
  { key: 'marcos_sp', doctorKey: 'dr_marcos', clinicKey: 'bellavita_sp', defaultDuration: 30, scheduleVariant: 'standard' as const },
  { key: 'lucia_smile', doctorKey: 'dr_lucia', clinicKey: 'smileplus', defaultDuration: 45, scheduleVariant: 'extended' as const },
  { key: 'ana_smile', doctorKey: 'dr_ana', clinicKey: 'smileplus', defaultDuration: 60, scheduleVariant: 'standard' as const },
]

export async function seedDoctorClinics(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding doctor_clinics and schedules...')

  for (const link of DOCTOR_CLINIC_LINKS) {
    const doctorId = ctx.userIds[link.doctorKey]
    const clinicId = ctx.clinicIds[link.clinicKey]
    if (!doctorId || !clinicId) continue

    const [dc] = await db.insert(doctorClinics).values({
      doctorId,
      clinicId,
      isActive: true,
      defaultDuration: link.defaultDuration,
    }).returning()

    ctx.doctorClinicIds[link.key] = dc.id

    // Create schedule for this doctor-clinic link
    await db.insert(doctorClinicSchedules).values({
      doctorClinicId: dc.id,
      weeklySchedule: buildWeeklySchedule(link.scheduleVariant) as any,
      specificBlocks: buildSpecificBlocks() as any,
      defaultAppointmentDuration: link.defaultDuration,
      minimumAdvanceHours: 2,
      maxFutureDays: 60,
    })
  }

  if (verbose) console.log(`  ✓ ${DOCTOR_CLINIC_LINKS.length} doctor_clinics + schedules created`)
}
